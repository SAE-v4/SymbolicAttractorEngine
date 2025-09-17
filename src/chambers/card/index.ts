import { CardLayoutChamberEl } from "./components/CardLayoutChamber";
if (!customElements.get("sae-card-chamber")) {
  customElements.define("sae-card-chamber", CardLayoutChamberEl);
}
