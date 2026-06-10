import React, { useEffect, useState, useCallback } from 'react';
import { GiftedChat, Bubble, Avatar, Time } from 'react-native-gifted-chat';
import { View, StyleSheet, SafeAreaView, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import api, { API_BASE_URL, TokenManager } from '../src/config';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CustomInputToolbar from './CustomInputToolbar';
import Markdown from 'react-native-markdown-display';
import { logChatInteraction } from '../src/api/s3_upload';
import { useAppState } from "../src/AppStateHandler";

function Chat() {
  const [messages, setMessages] = useState([
    {
      _id: 1,
      text: "Hello! I'm Trippy, an AI travel guide specifically designed to assist travelers in Hong Kong. My goal is to make your travel experience as smooth and enjoyable as possible. Here's how I can help:\n\nPlace Search: I can search for information about specific places in Hong Kong. For example, I can help you find popular restaurants, tourist attractions, or any other places of interest.\n\nRoute Guidance: I can provide directions between two locations. Just give me the starting point and the destination, and I'll show you the route visually and provide a Google Maps link.\n\nQuestion Handling: I can use multiple tools simultaneously to answer complex questions. This ensures you get the most accurate and comprehensive information.\n\nAdditional Information: I can provide various other details such as weather updates, reviews, ratings, and more about specific places.\n\nFeel free to ask me anything you need help with during your travels in Hong Kong!",
      createdAt: new Date(),
      user: {
        _id: 2,
        name: 'Chatbot',
        avatar: 'chatbot',
      },
    },
  ]);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const setLastUsedFeature = useAppState();

  useEffect(() => {
    setLastUsedFeature('Chatbot');
}, [setLastUsedFeature]);


  const onSend = useCallback(async (newMessages = []) => {
    const userMessage = newMessages[0].text;
    const formData = new FormData();
    formData.append('message', userMessage);
    formData.append('userId', userId);

    const resizeImage = async (uri) => {
      const resizedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      return resizedImage.uri;
    };

    if (image) {
      console.log('Preparing image for upload...');
      const resizedImageUri = await resizeImage(image);
      formData.append('image', {
        uri: resizedImageUri,
        type: "image/jpeg",
        name: "chatphoto.jpg"
      });

      newMessages[0].image = image;
      console.log('Image appended to formData');
      setImage(null);
    }
    console.log('FormData contents:', formData);

    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));

    // Temporary message while waiting for the chatbot response
    const tempMessage = {
      _id: Math.random().toString(36).substring(7),
      text: "Generating Accurate Response...",
      createdAt: new Date(),
      user: {
        _id: 2,
        name: 'Chatbot',
        avatar: 'chatbot',
      },
    };
    setMessages(previousMessages => GiftedChat.append(previousMessages, [tempMessage]));
    setLoading(true);

    const token = await TokenManager.getAccessToken();
    try {
      // Send the formData directly in the request body
      const response = await api.post(`/api/chatbot`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const chatbotResponse = response.data;
      if (!chatbotResponse) {
        throw new Error('Invalid response from chatbot');
      }

      const botMessage = {
        _id: Math.random().toString(36).substring(7),
        text: chatbotResponse,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Chatbot',
          avatar: 'chatbot',
        },
      };

      // Log the chat interaction
      await logChatInteraction(userId, userMessage, chatbotResponse);

      // Replace the temporary message with the actual response
      setMessages(previousMessages => {
        const updatedMessages = previousMessages.filter(msg => msg.text !== "Generating Accurate Response...");
        return GiftedChat.append(updatedMessages, [botMessage]);
      });
    } catch (error) {
      console.error('Error sending message:', error.response ? error.response.data : error.message);
      Alert.alert('Error', 'Failed to send message. Please try again later.');
    } finally {
      setLoading(false);
    }

  }, [image, userId]);

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(
        'Unable to open this photo',
        'This image may still be in iCloud or not available locally on your iPhone. Please open it in Photos first so it downloads, then try again.'
      );
    }
  };

  const removeImage = () => {
    setImage(null);
  };

  const renderBubble = (props) => {
    if (props.currentMessage.user._id === 2) {
      // AI message
      return (
        <View style={styles.gradientBubbleContainer}>
          <LinearGradient
            style={[styles.gradientBubble, { padding: 10 }]} // Add padding here
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            colors={['#5468ff', '#81d8d0']}
          >
            <Markdown
              style={{
                body: { color: '#000', fontFamily: 'Montserrat-Medium', fontSize: 12 },
                link: { color: '#5468ff' },
              }}
            >
              {props.currentMessage.text}
            </Markdown>
          </LinearGradient>
        </View>
      );
    } else {
      // User message
      return (
        <View>
          {props.currentMessage.image && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: props.currentMessage.image }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            </View>
          )}
          < Bubble
            {...props}
            renderMessageImage={() => null}
            wrapperStyle={{
              right: {
                backgroundColor: '#FFF',
                maxWidth: '80%',
              },
              left: {
                backgroundColor: '#FFF',
                maxWidth: '80%',
              },
            }}
            textStyle={{
              right: styles.bubbleText,
              left: styles.bubbleText,
            }}
            renderTime={(timeProps) => (
              <Time
                {...timeProps}
                timeTextStyle={{
                  right: styles.timeText,
                  left: styles.timeText,
                }}
              />
            )}
          />
        </View>
      );
    }
  };

  const renderInputToolbar = (props) => (
    <View>
      {image && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: image }} style={styles.imagePreview} />
          <TouchableOpacity onPress={removeImage} style={styles.removeImageButton}>
            <Ionicons name="close-circle" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}
      <CustomInputToolbar
        {...props}
        onImagePick={pickImage}
        onTextChanged={(text) => props.onTextChanged(text)}
        onSend={props.onSend}
      />
    </View>
  );


  const renderAvatar = (props) => {
    if (props.currentMessage.user._id === 2) {
      return (
        <LinearGradient
          colors={['#5468ff', '#81d8d0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarContainer}
        >
          <Ionicons name="infinite-outline" size={25} color="#c2ecfd" style={styles.avatar} />
        </LinearGradient>
      );
    }
    return <Avatar {...props} />;
  };

  const Navbar = ({ title }) => (
    <View style={styles.navbar}>
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color="white" />
      </TouchableOpacity>
      <View style={styles.navbarTitleContainer}>
        <LinearGradient
          colors={['#5468ff', '#81d8d0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.navbarAvatarContainer}
        >
          <Ionicons name="infinite-outline" size={25} color="#c2ecfd" style={styles.navbarAvatar} />
        </LinearGradient>
        <Text style={styles.navbarTitle}>{title}</Text>
      </View>
      <TouchableOpacity style={styles.navbarIcon}>
        <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Navbar title="Infinity" />
        <View style={styles.chatContainer}>
          <GiftedChat
            messages={messages}
            onSend={newMessages => onSend(newMessages)}
            user={{
              _id: 1,
            }}
            renderBubble={renderBubble}
            renderInputToolbar={renderInputToolbar}
            alignTop={true}
            renderAvatar={renderAvatar}
            placeholder='Type a message...'
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradientBubbleContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 8,
    paddingHorizontal: 10, 
    paddingVertical: 5,   
  },
  gradientBubble: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    maxWidth: '80%',
    padding: 10,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 25,
    height: 25,
    borderRadius: 20,
  },
  navbar: {
    height: 60,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  navbarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  navbarAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  navbarAvatar: {
    width: 25,
    height: 25,
  },
  navbarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 5
  },
  bubbleText: {
    color: '#000',
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 10
  },
  timeText: {
    color: '#000',
  },
  imagePreviewContainer: {
    position: 'relative',
    margin: 10,
    alignItems: 'flex-end',

  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
  },
  imageContainer: {
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  messageImageContainer: {
    marginTop: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
});

export default Chat;
