const MessageTail = ({ isOwnMessage, color }) => (
    <Svg width="12" height="20" style={[
        styles.tail,
        isOwnMessage ? styles.ownTail : styles.otherTail
    ]}>
        <Path
            d={isOwnMessage
                ? "M12 0 Q0 10 12 20" // 오른쪽 꼬리
                : "M0 0 Q12 10 0 20"  // 왼쪽 꼬리
            }
            fill={color}
        />
    </Svg>
);
