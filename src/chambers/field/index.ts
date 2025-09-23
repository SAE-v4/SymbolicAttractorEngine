import { FieldChamberEl }   from "./FieldChamber";
//import { GestureLayerEl }   from "./components/GestureLayer";
import { FieldGestureLayerEl } from "@/chambers/field/components/FieldGesture";
import { SaeFieldBgEl } from "./components/FieldBG"
import { FieldWitnessEl }   from "./components/FieldWitness";

if (!customElements.get("sae-field-chamber")) {
  customElements.define("sae-field-chamber", FieldChamberEl);
}
if (!customElements.get("sae-gesture-layer")) {
  customElements.define("sae-gesture-layer", FieldGestureLayerEl);
}
if (!customElements.get("sae-field-bg")) {
  customElements.define("sae-field-bg", SaeFieldBgEl);
}
if (!customElements.get("sae-field-witness")) {
  customElements.define("sae-field-witness", FieldWitnessEl);
}
