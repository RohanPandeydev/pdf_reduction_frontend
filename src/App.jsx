import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
// import "./App.css";
// import PDFViewer from "./pages/PDFViewer";
import PDFConfidentialApp from "./pages/PDFNEW";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <PDFConfidentialApp />
    </>
  );
}

export default App;
