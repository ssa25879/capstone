import React, { useRef, useEffect } from "react";
import { Editor } from "@toast-ui/editor";
import "@toast-ui/editor/dist/toastui-editor.css";

const EditBox = () => {
  const editorContainerRef = useRef();
  const editorRef = useRef();

  useEffect(() => {
    editorRef.current = new Editor({
      el: editorContainerRef.current,
      height: "500px",
      initialEditType: "markdown",
      previewStyle: "vertical",
    });

    return () => {
      editorRef.current?.destroy();
    };
  }, []);

  const handleSubmit = () => {
    const editorInstance = editorRef.current;
    const content = editorInstance.getMarkdown();

    console.log(content);
    // 게시물 저장 로직 구현
    // ...
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <h2>새 게시물 작성</h2>
      <div ref={editorContainerRef} style={{ backgroundColor: "white" }} />
      <button onClick={handleSubmit}>작성 완료</button>
    </div>
  );
};

export default EditBox;
