import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, ClipPath, Rect } from 'react-native-svg';

const Star = ({ filled, halfFilled }) => {
  return (
    <View style={styles.starContainer}>
      {filled || halfFilled ? (
        <Svg height="12" width="12" viewBox="0 0 24 24">
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#81d8d0" stopOpacity="1" />
              <Stop offset="1" stopColor="#5468ff" stopOpacity="1" />
            </LinearGradient>
            <ClipPath id="half">
              <Rect x="0" y="0" width="12" height="24" />
            </ClipPath>
          </Defs>
          <Path
            d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.869 1.4-8.168L.132 9.21l8.2-1.192z"
            fill={halfFilled ? "url(#grad)" : "url(#grad)"}
            clipPath={halfFilled ? "url(#half)" : ""}
          />
          {halfFilled && (
            <Path
              d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896V.587z"
              fill="#fff"
              clipPath="url(#half)"
              transform="translate(12, 0) scale(-1, 1)"
            />
          )}
        </Svg>
      ) : (
        <Svg height="12" width="12" viewBox="0 0 24 24">
          <Path
            d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.869 1.4-8.168L.132 9.21l8.2-1.192z"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
          />
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  starContainer: {
    position: 'relative',
    width: 12,
    height: 12,
  },
});

export default Star;
