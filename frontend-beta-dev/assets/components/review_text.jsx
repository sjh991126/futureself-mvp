import React, { useState } from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';

const ReviewText = ({ text, maxChars = 200 }) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) {
    return (
      <View>
        <Text style={styles.ReviewText}>No review text available</Text>
      </View>
    );
  }

    const toggleExpanded = () => {
      setExpanded(!expanded);
    };

    const shouldTruncate = text.length > maxChars;
    const displayText = !expanded && shouldTruncate ? text.slice(0, maxChars) + '...   ' : text;

    return (
      <View>
        <Text style={styles.ReviewText}>
          {displayText}
          {shouldTruncate && (
            <TouchableOpacity onPress={toggleExpanded}>
              <Text style={styles.SeeMoreButton}>
                {expanded ? '   LESS' : 'MORE'}
              </Text>
            </TouchableOpacity>
          )}
        </Text>

      </View>
    );
  };

  const styles = StyleSheet.create({
    ReviewText: {
      fontSize: 13,
      // fontFamily: "Montserrat-Regular",
      fontWeight: "400",
      color: "#fff",
      marginTop: 10,
      textAlignVertical: 'top',
    },
    SeeMoreButton: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600',
      position: 'relative',
      top: 3,
    }
  });

  export default ReviewText;
