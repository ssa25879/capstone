import "./App.css";
import React from "react";
import Editor from "@toast-ui/editor";
import "@toast-ui/editor/dist/toastui-editor.css"; // Editor 스타일

const editor = new Editor({
  el: document.querySelector("#editor"),
});

function App() {
  return (
    <>
      <script src="https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js  "></script>
      <div id="editor">
        <link
          rel="stylesheet"
          href="https://uicdn.toast.com/editor/latest/toastui-editor.min.css"
        />
      </div>
    </>
  );
}

export default App;
