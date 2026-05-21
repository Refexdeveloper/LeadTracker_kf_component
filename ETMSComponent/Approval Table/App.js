import { Fragment, useEffect, useState } from "react";
import KFSDK from "@kissflow/lowcode-client-sdk";

import  ManagerApproval  from "./managerapproval.jsx";

import "./App.css";


 function App() {
  const [kf, setKf] = useState();

  useEffect(() => {
    setTimeout(() => {
      loadKfSdk();
    }, 300);
  }, []);

  async function loadKfSdk() {
    let kf = await KFSDK.initialize();
    window.kf = kf;
    setKf(kf);
  
  }

  return <Fragment>{ kf&& <ManagerApproval />}</Fragment>;

}
export default App;
