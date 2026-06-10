import * as React from "react"
import Svg, { G, Path, Defs, ClipPath } from "react-native-svg"
const SvgComponent = (props) => (
<Svg xmlns="http://www.w3.org/2000/svg" fill="none" {...props}>
    <G
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth= {2}
        clipPath="url(#a)"
    >
        <Path
            d="M14.167 17.5v-1.667a3.333 3.333 0 0 0-3.334-3.333H4.167a3.333 3.333 0 0 0-3.334 3.333V17.5M7.5 9.167a3.333 3.333 0 1 0 0-6.667 3.333 3.333 0 0 0 0 6.667ZM19.167 17.5v-1.667a3.333 3.333 0 0 0-2.5-3.225M13.333 2.608a3.334 3.334 0 0 1 0 6.459" />
    </G>
    <Defs>
        <ClipPath id="a">
            <Path fill="#fff" d="M0 0h20v20H0z" />
        </ClipPath>
    </Defs>
</Svg>
)
export default SvgComponent