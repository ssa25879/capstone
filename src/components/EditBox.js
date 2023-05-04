import React, { useRef, useEffect } from "react";
import { Editor } from "@toast-ui/editor";
import "@toast-ui/editor/dist/toastui-editor.css";
import "@toast-ui/editor/dist/theme/toastui-editor-dark.css";

const EditBox = () => {
  const editorContainerRef = useRef();
  const editorRef = useRef();

  useEffect(() => {
    editorRef.current = new Editor({
      el: editorContainerRef.current,
      initialEditType: "markdown",
      previewStyle: "vertical",
      alignContent: "center",
      theme: "dark",
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
    <div
      style={{
        width: "60%",
        height: "7000px",
        weight: "0",
        alignContent: "center",
        backgroundColor: "#1c1c1c",
      }}
    >
      <h2>새 게시물 작성</h2>
      <div
        ref={editorContainerRef}
        style={{
          alignContent: "center",
          backgroundColor: "#1c1c1c",
          color: "#1c1c1c",
        }}
      />
      <button onClick={handleSubmit} style={{ marginTop: "100px" }}>
        작성 완료
      </button>
    </div>
  );
};

export default EditBox;
