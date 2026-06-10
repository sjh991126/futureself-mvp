import * as React from "react"
import Svg, { Path } from "react-native-svg"
const SvgComponent = (props) => (
    <Svg xmlns="http://www.w3.org/2000/svg" fill="none" {...props}>
        <Path
            stroke="#000"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="m21 21-4.343-4.343m0 0A8 8 0 1 0 5.344 5.344a8 8 0 0 0 11.313 11.313Z"
        />
    </Svg>
)
export default SvgComponent
