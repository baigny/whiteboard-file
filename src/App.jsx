import React, { useState, useRef } from "react";
import { Stage, Layer, Rect, Line, Circle } from "react-konva";
import { Document, Page, pdfjs } from "react-pdf";
import {
  MoveUpRight,
  RectangleHorizontal,
  SquarePen,
  Undo,
  Paperclip,
  Circle as CircleIcon,
  Redo,
  OctagonX,
} from "lucide-react";

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const referenceDimensions = {
  width: 800,
  height: 500,
};

const App = () => {
  const stageRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState({
    1: { lines: [], shapes: [], actions: [] },
  });
  const [undoStack, setUndoStack] = useState([{ lines: [], shapes: [] }]);
  const [redoStack, setRedoStack] = useState([]);
  const [numPages, setNumPages] = useState(0);
  const [pdfFile, setPdfFile] = useState(null);
  const [selectedTool, setSelectedTool] = useState("SCRIBBLE");
  const [fillColor, setFillColor] = useState("#000000");
  const [thickness, setThickness] = useState(2);

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    setIsDrawing(true);

    setUndoStack((prevUndoStack) => [
      ...prevUndoStack,
      {
        lines: [...(pages[currentPage]?.lines || [])],
        shapes: [...(pages[currentPage]?.shapes || [])],
      },
    ]);

    setPages((prevPages) => {
      const currentPageData = prevPages[currentPage] || {
        lines: [],
        shapes: [],
        actions: [],
      };

      if (selectedTool === "SCRIBBLE") {
        currentPageData.lines.push({ points: [pos.x, pos.y], thickness });
      } else {
        currentPageData.shapes.push({
          type: selectedTool,
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          thickness,
        });
      }
      return { ...prevPages, [currentPage]: currentPageData };
    });

    setRedoStack([]);
    e.evt.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const point = stage.getPointerPosition();
    if (!point) return;

    setPages((prevPages) => {
      const currentPageData = prevPages[currentPage];
      if (selectedTool === "SCRIBBLE") {
        const lastLine =
          currentPageData.lines[currentPageData.lines.length - 1];
        lastLine.points = lastLine.points.concat([point.x, point.y]);
      } else {
        const lastShape =
          currentPageData.shapes[currentPageData.shapes.length - 1];
        lastShape.width = point.x - lastShape.x;
        lastShape.height = point.y - lastShape.y;
      }
      return { ...prevPages, [currentPage]: currentPageData };
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const undoAction = () => {
    if (undoStack.length === 0) return;

    const lastState = undoStack.pop();
    setRedoStack((prevRedoStack) => [
      ...prevRedoStack,
      {
        lines: [...(pages[currentPage]?.lines || [])],
        shapes: [...(pages[currentPage]?.shapes || [])],
      },
    ]);

    setPages((prevPages) => ({
      ...prevPages,
      [currentPage]: {
        lines: lastState.lines,
        shapes: lastState.shapes,
      },
    }));
  };

  const redoAction = () => {
    if (redoStack.length === 0) return;

    const lastState = redoStack.pop();
    setUndoStack((prevUndoStack) => [
      ...prevUndoStack,
      {
        lines: [...(pages[currentPage]?.lines || [])],
        shapes: [...(pages[currentPage]?.shapes || [])],
      },
    ]);

    setPages((prevPages) => ({
      ...prevPages,
      [currentPage]: {
        lines: lastState.lines,
        shapes: lastState.shapes,
      },
    }));
  };

  const resetCanvas = () => {
    setPages({
      1: { lines: [], shapes: [], actions: [] },
    });
    setUndoStack([{ lines: [], shapes: [] }]);
    setRedoStack([]);
    setCurrentPage(1);
  };

  const clearCanvas = () => {
    setPages((prevPages) => ({
      ...prevPages,
      [currentPage]: { lines: [], shapes: [], actions: [] },
    }));
    setUndoStack([{ lines: [], shapes: [] }]);
    setRedoStack([]);
  };

  const navigatePage = (page) => {
    if (!pages[page]) {
      setPages((prevPages) => ({
        ...prevPages,
        [page]: { lines: [], shapes: [], actions: [] },
      }));
    }
    setCurrentPage(page);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfFile(file);
      setNumPages(0);
      setCurrentPage(1);
      resetCanvas();
    } else {
      console.error("Failed to load file.");
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error) => {
    console.error("Error loading document: ", error.message);
  };

  const currentLines = pages[currentPage]?.lines || [];
  const currentShapes = pages[currentPage]?.shapes || [];

  return (
    <div className="w-full flex flex-col items-center overflow-y-auto h-screen">
      <div
        className="relative bg-white border"
        style={{
          width: referenceDimensions.width,
          height: referenceDimensions.height,
          margin: "0 auto",
        }}
      >
        <div
          className="absolute top-0 left-0 z-10 flex justify-center items-center space-x-2"
          style={{ padding: "4px" }}
        >
          <label htmlFor="fileInput" className="cursor-pointer">
            <Paperclip size="1.5rem" />
          </label>
          <input
            type="file"
            id="fileInput"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
        <div
          style={{
            width: referenceDimensions.width,
            height: referenceDimensions.height,
            overflow: "hidden",
          }}
        >
          {pdfFile && (
            <Document
              file={pdfFile}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
            >
              <Page
                pageNumber={currentPage}
                width={referenceDimensions.width}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          )}
        </div>
        <Stage
          ref={stageRef}
          width={referenceDimensions.width}
          height={referenceDimensions.height}
          style={{ position: "absolute", top: 0, left: 0 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              height={referenceDimensions.height}
              width={referenceDimensions.width}
              fill="transparent"
            />
            {currentLines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color || fillColor}
                strokeWidth={line.thickness}
                tension={0.5}
                lineCap="round"
              />
            ))}
            {currentShapes.map((shape, i) => {
              switch (shape.type) {
                case "CIRCLE":
                  return (
                    <Circle
                      key={i}
                      x={shape.x}
                      y={shape.y}
                      radius={Math.abs(shape.width)}
                      stroke={shape.color || fillColor}
                      strokeWidth={shape.thickness}
                    />
                  );
                case "RECTANGLE":
                  return (
                    <Rect
                      key={i}
                      x={shape.x}
                      y={shape.y}
                      width={Math.abs(shape.width)}
                      height={Math.abs(shape.height)}
                      stroke={shape.color || fillColor}
                      strokeWidth={shape.thickness}
                    />
                  );
                case "ARROW":
                  return (
                    <Line
                      key={i}
                      points={[
                        shape.x,
                        shape.y,
                        shape.x + shape.width,
                        shape.y + shape.height,
                      ]}
                      stroke={shape.color || fillColor}
                      strokeWidth={shape.thickness}
                      tension={0.5}
                      lineCap="round"
                    />
                  );
                default:
                  return null;
              }
            })}
          </Layer>
        </Stage>
        <div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
          style={{ padding: "4px" }}
        >
          <ToolBar
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            fillColor={fillColor}
            setFillColor={setFillColor}
            undo={undoAction}
            redo={redoAction}
            clearAll={clearCanvas}
          />
        </div>
        <div className="absolute bottom-0 right-0" style={{ padding: "4px" }}>
          <PaginationComponent
            currentPage={currentPage}
            numPages={numPages}
            navigatePage={navigatePage}
          />
        </div>
      </div>
    </div>
  );
};

const ToolBar = ({ selectedTool, setSelectedTool, undo, redo, clearAll }) => {
  const handleToolSelect = (toolId) => {
    setSelectedTool(toolId);
  };

  const getButtonClass = (toolId) =>
    selectedTool === toolId
      ? "bg-violet-300 p-1 rounded"
      : "p-1 hover:bg-violet-100 rounded";

  return (
    <div className="flex justify-center items-center gap-3 py-2 px-3 my-4 w-fit mx-auto border shadow-lg rounded-lg bg-white">
      <button
        variant="outline"
        className={getButtonClass("SCRIBBLE")}
        onClick={() => handleToolSelect("SCRIBBLE")}
      >
        <SquarePen size="24px" />
      </button>
      <button
        variant="outline"
        className={getButtonClass("ARROW")}
        onClick={() => handleToolSelect("ARROW")}
      >
        <MoveUpRight size="24px" />
      </button>
      <button
        variant="outline"
        className={getButtonClass("RECTANGLE")}
        onClick={() => handleToolSelect("RECTANGLE")}
      >
        <RectangleHorizontal size="24px" />
      </button>
      <button
        variant="outline"
        className={getButtonClass("CIRCLE")}
        onClick={() => handleToolSelect("CIRCLE")}
      >
        <CircleIcon size="24px" />
      </button>
      <button variant="outline" onClick={undo}>
        <Undo size="24px" />
      </button>
      <button variant="outline" onClick={redo}>
        <Redo size="24px" />
      </button>
      <button variant="outline" onClick={clearAll}>
        <OctagonX size="24px" />
      </button>
    </div>
  );
};

const PaginationComponent = ({ currentPage, numPages, navigatePage }) => {
  const isFirstPage = currentPage === 1;
  const isLastPage = numPages ? currentPage === numPages : false;

  return (
    <div className="flex justify-center items-center gap-2 py-2 px-3 my-4 w-fit mx-auto border shadow-lg rounded-lg bg-white">
      <button
        variant="outline"
        disabled={isFirstPage}
        onClick={() => !isFirstPage && navigatePage(currentPage - 1)}
        className={isFirstPage ? "cursor-not-allowed" : "cursor-pointer"}
      >
        Previous
      </button>
      <span className="text-sm text-center flex justify-center items-center">
        Page {currentPage} {numPages ? `of ${numPages}` : ""}
      </span>
      <button
        variant="outline"
        disabled={isLastPage}
        onClick={() => !isLastPage && navigatePage(currentPage + 1)}
        className={isLastPage ? "cursor-not-allowed" : "cursor-pointer"}
      >
        Next
      </button>
    </div>
  );
};

export default App;
