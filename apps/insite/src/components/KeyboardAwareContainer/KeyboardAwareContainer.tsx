import React, { forwardRef, ReactNode } from "react";
import {
  View,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Keyboard,
  ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface KeyboardAwareContainerProps extends ScrollViewProps {
  children: ReactNode;
  className?: string;
}

export const KeyboardAwareContainer = forwardRef<ScrollView, KeyboardAwareContainerProps>(
  ({ children, className = "flex-1 px-5 pt-5", contentContainerStyle, ...scrollViewProps }, ref) => {
    const insets = useSafeAreaInsets();

    return (
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          <ScrollView
            ref={ref}
            className={className}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              {
                paddingBottom: insets.bottom + 120, // Static generous bottom inset
              },
              contentContainerStyle,
            ]}
            {...scrollViewProps}
          >
            <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
              {children}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }
);