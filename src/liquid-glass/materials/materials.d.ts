import registry from "./materials.json";
export declare const glassMaterialKeys: readonly ["scale", "depth", "curvature", "splay", "chroma", "blur", "glow", "edgeHighlight", "edgeShadow", "highlightCompress", "specularAngle", "specular", "specularDecay", "tint", "fill"];
export type GlassMaterialKey = (typeof glassMaterialKeys)[number];
export type GlassMaterialParams = {
    scale: number;
    depth: number;
    curvature: number;
    splay: number;
    chroma: number;
    blur: number;
    glow: number;
    edgeHighlight: number;
    edgeShadow: number;
    /** Compresses bright backdrop content (gamma); dark content stays put. */
    highlightCompress: number;
    specularAngle: number;
    specular: number;
    /** Exponent applied to the baked specular highlight's falloff curve. */
    specularDecay: number;
    tint: number;
    fill: string;
};
export type GlassMaterialMode = "dark" | "light";
export type GlassPhysicalMaterialName = keyof typeof registry.physical;
export type GlassSemanticMaterialName = keyof typeof registry.recipes;
export type GlassMaterialName = GlassPhysicalMaterialName | GlassSemanticMaterialName;
export type GlassMaterialKind = "physical" | "semantic";
export type GlassMaterialInput = GlassMaterialName | ({
    preset?: GlassMaterialName;
} & Partial<GlassMaterialParams>);
export type GlassMaterialDescriptor = {
    name: GlassMaterialName;
    kind: GlassMaterialKind;
    label: string;
    description: string;
    base?: GlassPhysicalMaterialName;
};
export declare const glassPhysicalMaterialNames: readonly ("regular" | "thin" | "ultraThin" | "thick" | "ultraThick")[];
export declare const glassSemanticMaterialNames: readonly ("navigation" | "control" | "panel" | "selectionPressed")[];
export declare const glassMaterialNames: readonly GlassMaterialName[];
export declare function normalizeGlassMaterialParams(value: unknown): GlassMaterialParams;
export declare function normalizeGlassMaterialOverrides(value: unknown): Partial<GlassMaterialParams>;
export declare function isGlassMaterialName(value: unknown): value is GlassMaterialName;
export declare function getGlassMaterialDescriptor(name: GlassMaterialName): GlassMaterialDescriptor;
export declare function getGlassMaterialSource(name: GlassMaterialName): GlassMaterialParams;
/** Fill color as shown/edited for the active material mode. */
export declare function glassFillForMode(sourceFill: string, mode?: GlassMaterialMode): string;
/** Convert a mode-displayed fill back into the stored dark-source fill. */
export declare function glassFillToSource(modeFill: string, mode?: GlassMaterialMode): string;
export declare function applyGlassMaterialMode(value: GlassMaterialParams, mode?: GlassMaterialMode): GlassMaterialParams;
export declare function resolveGlassMaterial(input?: GlassMaterialInput, mode?: GlassMaterialMode): GlassMaterialParams;
export declare function diffGlassMaterialParams(value: GlassMaterialParams, base: GlassMaterialParams): Partial<GlassMaterialParams>;
export declare function glassMaterialParamsEqual(a: GlassMaterialParams, b: GlassMaterialParams): boolean;
