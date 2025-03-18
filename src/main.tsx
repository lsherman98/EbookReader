import { RouterProvider, createRouter } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import { MyRuntimeProvider } from "./components/NestedSideBarContent";

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MyRuntimeProvider>
      <RouterProvider router={router} />
    </MyRuntimeProvider>
  </React.StrictMode>
);
