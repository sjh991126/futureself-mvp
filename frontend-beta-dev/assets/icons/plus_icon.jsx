import * as React from "react";
import Svg, { Rect, Path, Defs, LinearGradient, Stop } from "react-native-svg";

const PlusIcon = (props) => (
  <Svg width="37" height="37" viewBox="0 0 37 37" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <Rect width="37" height="37" rx="10" fill="white" />
    <Path
      d="M25.2365 18.3868H19.0774V12.59C19.0774 12.2898 18.8189 12.0465 18.5 12.0465C18.1811 12.0465 17.9226 12.2898 17.9226 12.59V18.3868H11.7635C11.4446 18.3868 11.186 18.6301 11.186 18.9302C11.186 19.2304 11.4446 19.4737 11.7635 19.4737H17.9226V25.2705C17.9226 25.5706 18.1811 25.814 18.5 25.814C18.8189 25.814 19.0774 25.5706 19.0774 25.2705V19.4737H25.2365C25.5554 19.4737 25.8139 19.2304 25.8139 18.9302C25.8139 18.6301 25.5554 18.3868 25.2365 18.3868Z"
      fill="url(#paint0_linear)"
      stroke="url(#paint1_linear)"
    />
    <Defs>
      <LinearGradient id="paint0_linear" x1="25.8139" y1="18.9302" x2="11.186" y2="18.9302" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#81D8D0" />
        <Stop offset="1" stopColor="#5468FF" />
      </LinearGradient>
      <LinearGradient id="paint1_linear" x1="25.8139" y1="18.9302" x2="11.186" y2="18.9302" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#81D8D0" />
        <Stop offset="1" stopColor="#5468FF" />
      </LinearGradient>
    </Defs>
  </Svg>
);

export default PlusIcon;