import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

const ProfileScreen = () => {
  const router = useRouter();

  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ✅ Fetch profile and user email
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) return router.replace("/LoginScreen");

        setUserId(user.id);
        setEmail(user.email);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("username, first_name, last_name")
          .eq("user_id", user.id)
          .single();

        if (profileError) throw profileError;

        setUsername(profile.username || "");
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
      } catch (err) {
        console.error("Error fetching profile:", err.message);
        Alert.alert("Error", "Could not load profile information.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // ✅ Save updated profile
  const handleSaveProfile = async () => {
  try {
    setIsEditing(false);

    // Get logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No user logged in");

    // Update profile data
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username,
        first_name: firstName,
        last_name: lastName,
      })
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    // Notify user
    Alert.alert(
      "Profile Updated",
      "Your profile has been updated successfully. You’ll need to log in again.",
      [
        {
          text: "OK",
          onPress: async () => {
            // Logout user
            await supabase.auth.signOut();
            router.replace("/LoginScreen");
          },
        },
      ]
    );
  } catch (err) {
    console.error("Error updating profile:", err.message);
    Alert.alert("Error", err.message);
  }
};


  // ✅ Password update validation
  const validatePassword = (password) => {
    const minLength = /.{8,}/;
    const hasNumber = /[0-9]/;
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/;
    return (
      minLength.test(password) && hasNumber.test(password) && hasSymbol.test(password)
    );
  };

  // ✅ Update password securely with Supabase
  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }
    if (!validatePassword(newPassword)) {
      Alert.alert(
        "Error",
        "Password must be at least 8 characters long, include a number, and a special symbol."
      );
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      Alert.alert("Success", "Password changed successfully!");
      setShowPasswordForm(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Password update error:", err.message);
      Alert.alert("Error", "Failed to update password.");
    }
  };

  // ✅ Logout function
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/LoginScreen");
    } catch (err) {
      console.error("Logout error:", err.message);
      Alert.alert("Error", "Failed to log out.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#76c043" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Header */}
      <View style={styles.headerBox}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {firstName?.charAt(0)}
            {lastName?.charAt(0)}
          </Text>
        </View>
        <Text style={styles.username}>{username}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          style={[styles.input, !isEditing && styles.disabledInput]}
          editable={isEditing}
        />

        <Text style={styles.label}>First Name</Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          style={[styles.input, !isEditing && styles.disabledInput]}
          editable={isEditing}
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          style={[styles.input, !isEditing && styles.disabledInput]}
          editable={isEditing}
        />

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          value={email}
          editable={false}
          style={[styles.input, styles.disabledInput]}
        />
      </View>

      {/* Edit / Save */}
      {isEditing ? (
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
          <Text style={styles.saveText}>💾 Save Changes</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
          <Text style={styles.editText}>✏️ Edit Profile</Text>
        </TouchableOpacity>
      )}

      {/* Change Password */}
      {showPasswordForm ? (
        <View style={styles.infoBox}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            style={styles.input}
            placeholder="Enter new password"
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.input}
            placeholder="Confirm new password"
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSavePassword}>
            <Text style={styles.saveText}>✅ Save Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowPasswordForm(false)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowPasswordForm(true)}
        >
          <Text style={styles.secondaryButtonText}>Change Password</Text>
        </TouchableOpacity>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f4f4f4",
    padding: 20,
    alignItems: "center",
  },
  headerBox: {
    width: "100%",
    backgroundColor: "#76c043",
    paddingVertical: 40,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  avatar: {
    backgroundColor: "#fff",
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#76c043",
  },
  username: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  email: {
    fontSize: 16,
    color: "#eee",
    marginTop: 5,
  },
  infoBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  label: {
    color: "#333",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: "#eee",
    color: "#888",
  },
  editButton: {
    backgroundColor: "#76c043",
    padding: 15,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
  },
  editText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#2e7d32",
    padding: 15,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginBottom: 5,
    marginTop: 15,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "#444",
    padding: 15,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#999",
    padding: 15,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  cancelText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#d9534f",
    padding: 15,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default ProfileScreen;
