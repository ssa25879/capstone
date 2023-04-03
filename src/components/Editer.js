import React from "react";
import Editor from "@toast-ui/editor";

const editor = new Editor({
  el: document.querySelector("#editor"),
  height: "500px",
  initialEditType: "markdown",
  previewStyle: "vertical",
});

editor.getMarkdown();

function EditorBox() {
  return <div id="editor"></div>;
}

export default EditorBox;
