import React from 'react';
import { SvgXml } from 'react-native-svg';

const MediaIcon = () => {
    const svgMarkup = `
    <svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path id="Vector" d="M0.5 0H18.5V18H0.5V0ZM2.5 2V4H4.5V2H2.5ZM6.5 2V8H12.5V2H6.5ZM14.5 2V4H16.5V2H14.5ZM16.5 6H14.5V8H16.5V6ZM16.5 10H14.5V12H16.5V10ZM16.5 14H14.5V16H16.5V14ZM12.5 16V10H6.5V16H12.5ZM4.5 16V14H2.5V16H4.5ZM2.5 12H4.5V10H2.5V12ZM2.5 8H4.5V6H2.5V8Z" fill="white"/>
    </svg>
    `;
    return <SvgXml xml={svgMarkup} width="19" height="18" />;
};

export default MediaIcon;