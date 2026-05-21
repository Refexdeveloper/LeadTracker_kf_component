import { Fragment, useEffect, useState } from "react";
import KFSDK from "@kissflow/lowcode-client-sdk";

import  UpcomingTrips  from "./UpcomingTrips.jsx";

import "./App.css";


function App() {
  const [kf, setKf] = useState();

  useEffect(() => {
    setTimeout(() => {
      loadKfSdk();
    }, 200);
  }, []);

  async function loadKfSdk() {
    let kf = await KFSDK.initialize();
    window.kf = kf;
    setKf(kf);
  }
//expanded component

//columns

  return <Fragment>{kf && <UpcomingTrips />}</Fragment>;
}

export default App;
