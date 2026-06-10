import * as React from "react"
import Svg, { Path } from "react-native-svg"
const SvgComponent = (props) => (
    <Svg xmlns="http://www.w3.org/2000/svg" fill="none" {...props}>
        <Path
            stroke="#fff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M14.167 8.833a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5.833 17.166a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM11.667 12.167h5v4.166a.833.833 0 0 1-.834.834H12.5a.833.833 0 0 1-.833-.834v-4.166ZM3.333 3.833h5V8a.833.833 0 0 1-.833.833H4.167A.833.833 0 0 1 3.333 8V3.833Z"
        />
    </Svg>
)
export default SvgComponent
