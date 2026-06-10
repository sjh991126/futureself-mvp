import React from 'react';
import { Svg, Path, Defs, ClipPath, Rect, G } from 'react-native-svg';

const FocusedHomeIcon = ({ width = 24, height = 24 }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <G id="Icons" clipPath="url(#clip0_4060_2222)">
      <Path id="Vector" d="M8.34777 12.9173H7.84777V13.4173V21.1737H3.00548V9.31156L12 3.27915L20.9945 9.31156V21.1737H16.1522V13.4173V12.9173H15.6522H8.34777ZM0.423065 23.0769V23.5769H0.923065H9.93019H10.4302V23.0769V15.3205H13.5698V23.0769V23.5769H14.0698H23.0769H23.5769V23.0769V8.34326V8.07638L23.3552 7.92785L12.2783 0.507687L12 0.321279L11.7217 0.507687L0.644793 7.92785L0.423065 8.07638V8.34326V23.0769Z" fill="white" stroke="white"/>
    </G>
    <Defs>
      <ClipPath id="clip0_4060_2222">
        <Rect width="24" height="24" fill="white"/>
      </ClipPath>
    </Defs>
  </Svg>
);

export default FocusedHomeIcon;