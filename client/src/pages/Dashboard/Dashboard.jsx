import "./dashboard.css"

function Dashboard() {
  return (
    <>
    <section className="dashboard">
      <div className="word-space_container">
        <div className="word-space">
          <h2>words</h2>
        </div>
        <div className="microphone">
          <h2>microphone</h2>
        </div>
      </div>
      <div className="storage_container">
        <h2>storage</h2>
      </div>
    </section>
    </>
  )
}

export default Dashboard