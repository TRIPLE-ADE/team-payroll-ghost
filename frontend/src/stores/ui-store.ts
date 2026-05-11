import { create } from "zustand";

interface UiState {
  relationshipGraphFocusEmployeeId: string | null;
  setRelationshipGraphFocusEmployeeId: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  relationshipGraphFocusEmployeeId: null,
  setRelationshipGraphFocusEmployeeId: (id) =>
    set({ relationshipGraphFocusEmployeeId: id }),
}));
