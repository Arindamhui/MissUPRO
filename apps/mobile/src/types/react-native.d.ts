/* eslint-disable @typescript-eslint/no-empty-interface */
import type { StyleProp, ViewStyle } from "react-native";

// Augment FlatList props with common ScrollView props that are not included
// in the RN 0.74 type definitions but are valid at runtime.
declare module "react-native" {
  interface FlatListProps<ItemT> {
    contentContainerStyle?: StyleProp<ViewStyle>;
    columnWrapperStyle?: StyleProp<ViewStyle>;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
    style?: StyleProp<ViewStyle>;
  }
}

declare module "*.webp" {
  const src: number;
  export default src;
}
