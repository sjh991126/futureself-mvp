import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CustomInputToolbar = ({ onSend, text, onTextChanged, onImagePick }) => {
  const [inputHeight, setInputHeight] = useState(40);
  const textInputRef = useRef(null);

  const handleSend = () => {
    if (text && text.trim().length > 0) {
      onSend({ text: text.trim() }, true);
      if (textInputRef.current) {
        textInputRef.current.clear();
      }
      setInputHeight(40); // Reset height after sending
    }
  };

  const handleContentSizeChange = (event) => {
    const { height } = event.nativeEvent.contentSize;
    setInputHeight(Math.min(Math.max(40, height), 100)); // Min 40, Max 100
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.addButton} onPress={onImagePick}>
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.textInputWrapper}>
          <TextInput
            ref={textInputRef}
            style={[styles.textInput, { height: inputHeight }]}
            placeholder="Ask a question to Infinity..."
            placeholderTextColor="#8e8e93"
            value={text}
            onChangeText={onTextChanged}
            multiline
            onContentSizeChange={handleContentSizeChange}
          />
        </View>
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    minHeight: 40,
  },
  addButton: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  textInputWrapper: {
    flex: 1,
    marginLeft: 40,
    marginRight: 40,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#3a3a3c',
    borderRadius: 20,
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100, // Maximum height
  },
  sendButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});

export default CustomInputToolbar;