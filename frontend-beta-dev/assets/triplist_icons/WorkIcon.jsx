import React from 'react';
import { SvgXml } from 'react-native-svg';

const WorkIcon = () => {
    const svgMarkup = `
    <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path id="Vector" d="M6 0.5H15V4.5H20.5V19.5H0.5V4.5H6V0.5ZM8 4.5H13V2.5H8V4.5ZM2.5 6.5V17.5H18.5V6.5H2.5Z" fill="white"/>
    </svg>
    `;
    return <SvgXml xml={svgMarkup} width="21" height="20" />;
};

export default WorkIcon;