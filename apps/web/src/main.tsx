import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import Translate from "./pages/Translate";
import About from "./pages/About";
import Chat from "./pages/Chat";
import Stories from "./pages/Stories";
import "./App.css";
import { LlmActivityProvider } from "./llmActivity";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "translate", element: <Translate /> },
      { path: "stories", element: <Stories /> },
      { path: "chat", element: <Chat /> },
      { path: "about", element: <About /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <LlmActivityProvider>
    <RouterProvider router={router} />
  </LlmActivityProvider>,
);
