import "./dashboard.css";
import { useState } from "react";
import { FaMicrophone } from "react-icons/fa";
import { FaMicrophoneSlash } from "react-icons/fa";
import { FaRegTrashAlt } from "react-icons/fa";

const Icon = ({ icon, label, onClick, className }) => {
  return (
    <div className="icons_container" onClick={onClick}>
      <div className="icons-icon-wrapper">{icon}</div>
      {label}
    </div>
  );
};

function Dashboard() {
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <>
      <section className="dashboard">
        <div className="word-space_container">
          <div className="word-space">
            <h2>transcript</h2>
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic
              aliquam recusandae facere dolorem ea quae, beatae tempora nisi in
              sequi. Enim, natus. Officiis eveniet aliquam vel nobis sed minima
              cupiditate repellat nisi veniam error. Ratione, officia modi rerum
              commodi quibusdam ipsa temporibus sit aliquid officiis quaerat eum
              eligendi cumque fugit odio voluptates dolorem provident cupiditate
              ipsam accusantium excepturi expedita? Deleniti fuga inventore
              voluptatem doloremque iure. Unde ea amet adipisci quidem aperiam?
              Doloremque odio perferendis fugiat pariatur! Iure distinctio sunt
              autem tempore iusto quam, officiis aperiam! Accusamus, eum amet ex
              suscipit eaque, tenetur obcaecati necessitatibus laboriosam
              similique, magnam consequatur? Alias, quam.
            </p>
          </div>
          <div className="microphone">
            {isMuted ? (
              <Icon
                icon={<FaMicrophoneSlash />}
                label="Muted"
                onClick={toggleMute}
              />
            ) : (
              <Icon
                icon={<FaMicrophone />}
                label="Speaking"
                onClick={toggleMute}
              />
            )}
          </div>
        </div>
        <div className="storage_container">
          <h2>storage</h2>
          <div className="file">
            <p>file 1</p>
            <div className="delete_file">
              <Icon icon={<FaRegTrashAlt className="trash-icon" />}></Icon>
            </div>
          </div>

          <div className="file">
            <p>file 2</p>
            <div className="delete_file">
              <Icon icon={<FaRegTrashAlt className="trash-icon" />}></Icon>
            </div>
          </div>

          <div className="file">
            <p>file 3</p>
            <div className="delete_file">
              <Icon icon={<FaRegTrashAlt className="trash-icon" />}></Icon>
            </div>
          </div>

          <div className="file">
            <p>file 4</p>
            <div className="delete_file">
              <Icon icon={<FaRegTrashAlt className="trash-icon" />}></Icon>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Dashboard;
