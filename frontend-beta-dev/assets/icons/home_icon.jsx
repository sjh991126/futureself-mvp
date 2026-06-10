import React from 'react';
import { Svg, Path, Defs, ClipPath, Rect, G } from 'react-native-svg';

const HomeIcon = ({ width = 24, height = 24 }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <G id="Icons" clipPath="url(#clip0_4060_10231)">
      <Path id="Vector" d="M2.50548 21.6737H8.34777V13.4173H15.6522V21.6737H21.4945V9.04486L12 2.67711L2.50548 9.04486V21.6737ZM0.923065 23.0769V8.34326L12 0.923096L23.0769 8.34326V23.0769H14.0698V14.8205H9.93019V23.0769H0.923065Z" fill="white"/>
    </G>
    <Defs>
      <ClipPath id="clip0_4060_10231">
        <Rect width="24" height="24" fill="white"/>
      </ClipPath>
    </Defs>
  </Svg>
);

export default HomeIcon;