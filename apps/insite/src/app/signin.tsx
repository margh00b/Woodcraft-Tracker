import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSupabase } from "@/hooks/useSupabase";

export default function SignInScreen() {
  const router = useRouter();
  const { supabase, isAuthenticated, isLoading } = useSupabase();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  const onSignInPress = async () => {
    const normalizedUsername = username.trim().toLowerCase();

    if (!normalizedUsername || !password) {
      Alert.alert("Sign In", "Enter your username and password.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${normalizedUsername}@auth.woodcraftkc.com`,
        password,
      });

      if (error) {
        Alert.alert("Authentication Failed", error.message);
        return;
      }

      router.replace("/");
    } catch (error: any) {
      Alert.alert(
        "Authentication Failed",
        error?.message || "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || isLoading;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F1F1F7]"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#17152D" />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-[#17152D] px-7 pt-16 pb-24 overflow-hidden">
          <View className="absolute -right-16 -top-12 w-64 h-64 rounded-full border-[35px] border-white/[0.025]" />
          <View className="absolute -right-4 top-16 w-32 h-32 rounded-full border border-violet-300/10" />
          <View className="absolute left-24 -bottom-20 w-52 h-52 rounded-full bg-violet-600/10" />

          <View className="flex-row items-center mb-12">
            <View className="w-12 h-12 rounded-2xl bg-[#6654D9] items-center justify-center mr-3">
              <Text className="text-white text-2xl font-black">W</Text>
            </View>

            <View>
              <Text className="text-white text-lg font-extrabold tracking-[2px]">
                WOODCRAFT
              </Text>
              <Text className="text-violet-300 text-[9px] font-bold tracking-[3px] mt-1">
                KITCHEN CABINETS
              </Text>
            </View>
          </View>

          <View className="absolute bottom-0 right-8 flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-violet-400 mr-2" />
            <Text className="text-violet-300/70 text-[9px] font-bold tracking-[2px]">
              INSITE WORKSPACE
            </Text>
          </View>
        </View>

        <View className="px-5 -mt-24">
          <View
            className="bg-white rounded-[26px] p-6 border border-white"
            style={{
              shadowColor: "#17152D",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.1,
              shadowRadius: 18,
              elevation: 6,
            }}
          >
            <View className="flex-row items-center justify-between mb-7">
              <View>
                <Text className="text-[22px] font-extrabold text-[#17152D]">
                  Sign In
                </Text>
                <Text className="text-slate-400 text-xs mt-1">
                  Access your InSite account
                </Text>
              </View>

              <View className="w-12 h-12 rounded-2xl bg-[#F1EEFF] items-center justify-center">
                <Text className="text-[#6654D9] text-2xl font-bold">→</Text>
              </View>
            </View>

            <Text className="text-[11px] font-bold text-slate-600 tracking-[1.5px] mb-2">
              USERNAME
            </Text>

            <View className="h-[54px] flex-row items-center bg-[#F7F7FB] border border-[#E9E8F1] rounded-2xl px-4 mb-5">
              <View className="w-8 h-8 rounded-lg bg-white items-center justify-center mr-3">
                <Text className="text-[#6654D9] font-bold text-base">@</Text>
              </View>

              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                value={username}
                placeholder="Enter your username"
                placeholderTextColor="#A1A1B5"
                onChangeText={setUsername}
                className="flex-1 text-sm text-[#17152D] h-full"
                returnKeyType="next"
              />
            </View>

            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[11px] font-bold text-slate-600 tracking-[1.5px]">
                PASSWORD
              </Text>
            </View>

            <View className="h-[54px] flex-row items-center bg-[#F7F7FB] border border-[#E9E8F1] rounded-2xl px-4 mb-7">
              <View className="w-8 h-8 rounded-lg bg-white items-center justify-center mr-3">
                <Text className="text-[#6654D9] text-base">●</Text>
              </View>

              <TextInput
                value={password}
                placeholder="Enter your password"
                placeholderTextColor="#A1A1B5"
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                onChangeText={setPassword}
                onSubmitEditing={onSignInPress}
                className="flex-1 text-sm text-[#17152D] h-full"
                returnKeyType="go"
              />

              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={10}
              >
                <Text className="text-[10px] font-extrabold text-[#6654D9] tracking-wider">
                  {showPassword ? "HIDE" : "SHOW"}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={onSignInPress}
              disabled={isBusy}
              className={`h-[55px] rounded-2xl flex-row items-center justify-center ${
                isBusy ? "bg-[#9288D5]" : "bg-[#5141A5] active:bg-[#403285]"
              }`}
              style={{
                shadowColor: "#5141A5",
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: isBusy ? 0 : 0.22,
                shadowRadius: 9,
                elevation: isBusy ? 0 : 4,
              }}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="white" />
                  <Text className="text-white font-bold text-sm ml-3">
                    Signing in...
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-white font-bold text-sm tracking-wide">
                    Sign In to InSite
                  </Text>
                  <Text className="text-white text-lg ml-3">→</Text>
                </>
              )}
            </Pressable>

            <View className="flex-row items-center justify-center mt-6">
              <View className="w-5 h-5 rounded-full bg-emerald-50 items-center justify-center mr-2">
                <Text className="text-emerald-600 text-[10px]">✓</Text>
              </View>

              <Text className="text-slate-400 text-[11px]">
                Secure access for authorized personnel
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-1 justify-end items-center px-6 pt-10 pb-8">
          <Text className="text-[#17152D] text-xs font-extrabold tracking-[3px]">
            INSITE
          </Text>

          <View className="w-8 h-[2px] bg-[#6654D9] rounded-full my-3" />

          <Text className="text-[10px] text-slate-400 font-semibold tracking-[1.5px]">
            FIELD OPERATIONS PLATFORM
          </Text>

          <Text className="text-[10px] text-slate-300 mt-3">
            WOODCRAFT KITCHEN CABINETS
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
