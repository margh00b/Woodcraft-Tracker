import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSignIn } from "@clerk/expo/legacy";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";

export default function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/");
    }
  }, [isSignedIn]);

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: username,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else {
        Alert.alert("Notice", "Further authentication steps required.");
      }
    } catch (err: any) {
      Alert.alert(
        "Authentication Failed",
        err.errors?.[0]?.message || err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-6 bg-slate-50">
      <View className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Sign In</Text>
        <Text className="text-sm text-slate-500 mb-6">
          InSite Field Tracking Portal
        </Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="default"
          value={username}
          placeholder="username"
          onChangeText={setUsername}
          className="border border-slate-300 rounded-lg p-3.5 mb-4 text-slate-900 bg-white"
        />

        <TextInput
          value={password}
          placeholder="Password"
          secureTextEntry
          onChangeText={setPassword}
          className="border border-slate-300 rounded-lg p-3.5 mb-6 text-slate-900 bg-white"
        />

        <Pressable
          className="bg-slate-900 p-4 rounded-xl items-center"
          onPress={onSignInPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold">Sign In</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
