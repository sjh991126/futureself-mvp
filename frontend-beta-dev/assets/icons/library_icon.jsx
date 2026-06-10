import React from 'react';
import { Svg, Path, Defs, ClipPath, Rect, G } from 'react-native-svg';

const LibraryIcon = ({ width = 24, height = 24 }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <G id="Icons" clipPath="url(#clip0_4060_2226)">
      <Path id="Vector" fillRule="evenodd" clipRule="evenodd" d="M6.50759 1L7.32104 0H10.5748L11.3883 1V23L10.5748 24H7.32104L6.50759 23V1ZM8.13449 2V22H9.76139V2H8.13449ZM13.2934 2.69L13.7798 1.408L16.8384 0.04L17.8796 0.638L24 21.31L23.5136 22.592L20.4566 23.96L19.4154 23.362L13.2934 2.69ZM15.0992 2.946L20.6632 21.738L22.1925 21.056L16.6285 2.262L15.0992 2.946ZM0 1L0.813449 0H4.06725L4.88069 1V23L4.06725 24H0.813449L0 23V1ZM1.6269 2V22H3.2538V2H1.6269Z" fill="white"/>
    </G>
    <Defs>
      <ClipPath id="clip0_4060_2226">
        <Rect width="24" height="24" fill="white"/>
      </ClipPath>
    </Defs>
  </Svg>
);

export default LibraryIcon;