import { render } from "preact";
import App from "./App";
import { installExternalLinkHandling } from "./services/externalLinks";
import "./styles/index.css";

installExternalLinkHandling();
render(<App />, document.getElementById("root"));
