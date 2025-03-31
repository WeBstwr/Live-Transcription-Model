import os
import librosa
import numpy as np
import pandas as pd
import torch
from datasets import Dataset
from transformers import (
    WhisperForConditionalGeneration,
    WhisperProcessor,
    TrainingArguments,
    Trainer
)
import evaluate

# Constants – update these paths as needed (assumes files on Google Drive)
CSV_FILE = "/content/drive/My Drive/luhya_transcriptions/audio_text_pairs.csv"
AUDIO_DIR = "/content/drive/My Drive/luhya_transcriptions/audio_files"
MODEL_NAME = "openai/whisper-small"  # Using the small variant of Whisper
OUTPUT_DIR = "/content/drive/My Drive/luhya_transcriptions/fine_tuned_whisper_model"
SAMPLE_RATE = 16000

# 1. Load CSV dataset and filter out rows with empty filename or transcript
df = pd.read_csv(CSV_FILE)
df = df[(df["filename"].str.strip() != "") & (df["transcript"].str.strip() != "")]
df = df.reset_index(drop=True)

# 2. Function to load audio and add it to the example
def load_audio(example):
    file_path = os.path.join(AUDIO_DIR, example["filename"])
    waveform, sr = librosa.load(file_path, sr=SAMPLE_RATE)  # Load audio at 16kHz
    example["input_values"] = waveform.tolist()  # Convert waveform to list for serialization
    return example

# Create a Hugging Face dataset from the DataFrame and add audio data
dataset = Dataset.from_pandas(df)
dataset = dataset.map(load_audio)

# 3. Load the pre-trained Whisper processor and model
processor = WhisperProcessor.from_pretrained(MODEL_NAME)
model = WhisperForConditionalGeneration.from_pretrained(MODEL_NAME)

# 4. Prepare each example: process audio into input_features and tokenize transcript into labels
def prepare_example(example):
    # Process raw audio using the processor (which converts it to log-Mel spectrogram features)
    inputs = processor(example["input_values"], sampling_rate=SAMPLE_RATE, return_tensors="pt")
    # Save input_features as a NumPy array of shape (T, feature_dim)
    example["input_features"] = inputs.input_features[0].numpy()
    # Tokenize the transcript using the processor's tokenizer
    example["labels"] = processor.tokenizer(example["transcript"]).input_ids
    return example

dataset = dataset.map(prepare_example)

# 5. Remove unneeded columns and set dataset format for PyTorch
columns_to_remove = ["Relationship", "Maragoli", "Notes", "Example Sentence (English)", "filename", "transcript", "input_values"]
dataset = dataset.remove_columns(columns_to_remove)
dataset.set_format(type="torch", columns=["input_features", "labels"])

# 6. Split dataset into training and evaluation sets (80/20 split)
split_dataset = dataset.train_test_split(test_size=0.2, seed=42)
train_dataset = split_dataset["train"]
eval_dataset = split_dataset["test"]

# 7. Define a custom data collator for Whisper
def data_collator_whisper(batch):
    input_features = []
    for item in batch:
        feat = item["input_features"]
        # Convert to tensor if not already
        if not isinstance(feat, torch.Tensor):
            feat = torch.tensor(feat, dtype=torch.float)
        # Ensure it's 2D: if it's 1D, unsqueeze to add a feature dimension
        if feat.ndim == 1:
            feat = feat.unsqueeze(1)
        input_features.append(feat)
    
    # Pad input_features (each is of shape [time, feature_dim])
    padded_feats = torch.nn.utils.rnn.pad_sequence(input_features, batch_first=True, padding_value=0.0)
    
    # Process labels (they are 1D tensors)
    labels = [torch.tensor(item["labels"], dtype=torch.long) for item in batch]
    padded_labels = torch.nn.utils.rnn.pad_sequence(labels, batch_first=True, padding_value=processor.tokenizer.pad_token_id)
    
    return {"input_features": padded_feats, "labels": padded_labels}

data_collator = data_collator_whisper

# 8. Load evaluation metrics: WER and CER (requires jiwer)
wer_metric = evaluate.load("wer")
cer_metric = evaluate.load("cer")

def compute_metrics(pred):
    # Accessing logits from the predictions tuple (Whisper outputs logits directly)
    # pred.predictions will contain a tuple: (logits, encoder_last_hidden_state)
    logits = pred.predictions[0]  # Get the logits from the tuple
    pred_ids = logits.argmax(axis=-1)  # Use axis=-1 for argmax
    
    
    pred_str = processor.batch_decode(pred_ids, skip_special_tokens=True)
    
    label_ids = pred.label_ids
    label_ids[label_ids == -100] = processor.tokenizer.pad_token_id
    label_str = processor.batch_decode(label_ids, skip_special_tokens=True)  
    
    wer_score = wer_metric.compute(predictions=pred_str, references=label_str)
    cer_score = cer_metric.compute(predictions=pred_str, references=label_str)
    return {"wer": wer_score, "cer": cer_score}

# 9. Set training arguments with evaluation at each epoch
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    per_device_train_batch_size=2, 
    gradient_accumulation_steps=2,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    learning_rate=1e-5,
    num_train_epochs=5,
    logging_steps=10,
    fp16=torch.cuda.is_available(),
    save_total_limit=2,
    report_to="none"
)

# 10. Create the Trainer instance
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=data_collator,
    tokenizer=processor.feature_extractor,
    compute_metrics=compute_metrics
)

print("🚀 Starting fine-tuning on Whisper...")
trainer.train()

# 11. Save the fine-tuned model and processor
model.save_pretrained(OUTPUT_DIR)
processor.save_pretrained(OUTPUT_DIR)
print("✅ Model training complete! Model saved to:", OUTPUT_DIR)