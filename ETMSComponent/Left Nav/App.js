import React, { Fragment, useState, useEffect } from 'react';
import KFSDK from "@kissflow/lowcode-client-sdk";
import { LeftNavComp } from "./Leftnav";

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

  return <Fragment>{kf && <LeftNavComp />}</Fragment>;
}

 

export default App;