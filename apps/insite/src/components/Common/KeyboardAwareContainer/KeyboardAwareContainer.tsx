import React, {
  forwardRef,
  ReactNode,
  useRef,
  useImperativeHandle,
  useState,
  useEffect,
} from "react";
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
  keyboardVerticalOffset?: number;
}

export const KeyboardAwareContainer = forwardRef<
  ScrollView,
  KeyboardAwareContainerProps
>(
  (
    {
      children,
      className = "flex-1 px-5 pt-5",
      contentContainerStyle,
      keyboardVerticalOffset = 0,
      ...scrollViewProps
    },
    ref,
  ) => {
    const insets = useSafeAreaInsets();
    const internalRef = useRef<ScrollView>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useImperativeHandle(ref, () => internalRef.current as ScrollView);

    useEffect(() => {
      const showEvent =
        Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
      const hideEvent =
        Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

      const showSub = Keyboard.addListener(showEvent, (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      });
      const hideSub = Keyboard.addListener(hideEvent, () => {
        setKeyboardHeight(0);
      });

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    return (
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <ScrollView
            ref={internalRef}
            className={className}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            contentContainerStyle={[
              {
                flexGrow: 1,
                paddingBottom:
                  insets.bottom +
                  (keyboardHeight > 0 ? keyboardHeight + 40 : 20),
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
  },
);
