import "./dashboard.css";
import { useState } from "react";
import { FaMicrophone } from "react-icons/fa";
import { FaMicrophoneSlash } from "react-icons/fa";

const Icon = ({ icon, label, onClick }) => {
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
            <h2>words</h2>
          </div>
          <div className="microphone">
            {isMuted ? (
              <Icon icon={<FaMicrophoneSlash />} label="Muted" onClick={toggleMute} />
            ) : (
              <Icon icon={<FaMicrophone />} label="Speaking" onClick={toggleMute} />
            )}
          </div>
        </div>
        <div className="storage_container">
          <h2>storage</h2>
        </div>
      </section>
    </>
  );
}

export default Dashboard;
