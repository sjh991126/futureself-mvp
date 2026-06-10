import * as React from "react";
import Svg, { Defs, LinearGradient, Stop, Path } from "react-native-svg";

const FilledHeart = (props) => (
  <Svg
    width={props.width || 24} // Default to 28, but allow override via props
    height={props.height || 24} // Default to 28, but allow override via props
    viewBox="0 0 24 24"
    fill="none"
    {...props} // Spread props to allow external styles
  >
    <Path
      d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z"
      fill="url(#paint0_linear)"
    />
    <Defs>
      <LinearGradient id="paint0_linear" x1={12} y1={3} x2={12} y2={21.35} gradientUnits="userSpaceOnUse">
        <Stop stopColor="#81D8D0" />
        <Stop offset={1} stopColor="#5468FF" />
      </LinearGradient>
    </Defs>
  </Svg>
);

export default FilledHeart;
