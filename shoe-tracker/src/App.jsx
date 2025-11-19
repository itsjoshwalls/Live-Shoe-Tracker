import React from "react";
// Import SneakerReleases via the package-like folder export we added.
import SneakerReleases from "./SneakerReleases";
import EnvGate from "./components/EnvGate";


function App() {
  return (
    <div className="App">
      <EnvGate>
        <SneakerReleases />
      </EnvGate>
    </div>
  );
}

export default App;
