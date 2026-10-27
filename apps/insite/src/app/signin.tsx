import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSupabase } from "@/hooks/useSupabase";

export default function SignInScreen() {
  const router = useRouter();
  const { supabase, isAuthenticated, isLoading } = useSupabase();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <View className="flex-1 justify-center px-6 bg-slate-50">
      <View className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Sign In</Text>
        <Text className="text-sm text-slate-500 mb-6">
          InSite Field Tracking Portal
        </Text>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          placeholder="Username"
          onChangeText={setUsername}
          className="border border-slate-300 rounded-lg p-3.5 mb-4 text-slate-900 bg-white"
        />

        <TextInput
          value={password}
          placeholder="Password"
          secureTextEntry
          onChangeText={setPassword}
          onSubmitEditing={onSignInPress}
          className="border border-slate-300 rounded-lg p-3.5 mb-6 text-slate-900 bg-white"
        />

        <Pressable
          className="bg-slate-900 p-4 rounded-xl items-center"
          onPress={onSignInPress}
          disabled={loading || isLoading}
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
