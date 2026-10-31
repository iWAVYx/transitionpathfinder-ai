import { createContext } from "react";

/** An enclosing page shell already owns the document's main landmark. */
export const MainLandmarkContext = createContext(false);
