import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
export default function SearchScreen() {
  const [query, setQuery] = useState(""); // what user is typing
  const [submittedQuery, setSubmittedQuery] = useState(""); // what you actually search with

  function runSearch() {
    setSubmittedQuery(query.trim());
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Search</Text>

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Type to search"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={runSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.result}>
        Submitted query: {submittedQuery || "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  heading: { fontSize: 24, fontWeight: "600", marginBottom: 12 },
  inputWrapper: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f9f9f9",
  },
  input: { fontSize: 16, paddingVertical: 4 },
  result: { marginTop: 16, fontSize: 16, color: "#555" },
});
