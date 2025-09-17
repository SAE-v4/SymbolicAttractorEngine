import { CardLayoutChamberEl } from "./components/CardLayoutChamber";
import { FocusVesselEl } from "./components/FocusVessel";
import { WitnessRadarEl } from "./components/WitnessRadar";
import { BeingAuraEl } from "./components/BeingAura";
import { CardBGEl } from "./components/CardBG";

if (!customElements.get("sae-focus-vessel"))  customElements.define("sae-focus-vessel", FocusVesselEl);
if (!customElements.get("sae-witness-radar")) customElements.define("sae-witness-radar", WitnessRadarEl);
if (!customElements.get("sae-being-aura"))    customElements.define("sae-being-aura", BeingAuraEl);
if (!customElements.get("sae-card-chamber"))  customElements.define("sae-card-chamber", CardLayoutChamberEl);
if (!customElements.get("sae-card-bg")) customElements.define("sae-card-bg", CardBGEl);



