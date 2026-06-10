import { StyleSheet } from 'react-native';
import { Border, Color, FontFamily, FontSize } from "./authStyles";

const styles = StyleSheet.create({
    optionButton: {
        borderRadius: Border.br_3xs,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        color: Color.colorWhite,
        fontFamily: FontFamily.textRegular,
        fontSize: FontSize.textRegular_size,
    },
    groupOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: Border.br_3xs,
        marginVertical: 8,
    },
    groupOptionSelected: {
        backgroundColor: '#5468FF',
    },
    groupIcon: {
        fontSize: 20,
        marginRight: 10,
    },
    groupText: {
        color: Color.colorWhite,
        fontFamily: FontFamily.textRegular,
        fontSize: FontSize.textRegular_size,
    },
    foodContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 20,
        gap: 8,
    },
    foodChip: {
        backgroundColor: '#313131',
        borderRadius: Border.br_3xs,
        paddingHorizontal: 16,
        paddingVertical: 8,
        margin: 4,
    },
    foodChipSelected: {
        backgroundColor: '#5468FF',
    },
    foodText: {
        color: Color.colorWhite,
        fontFamily: FontFamily.textRegular,
        fontSize: FontSize.textRegular_size,
    },
    searchContainer: {
        marginVertical: 15,
    },
    searchBox: {
        backgroundColor: '#313131',
        borderRadius: Border.br_3xs,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 45,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: Color.colorWhite,
        fontSize: FontSize.textRegular_size,
    },
    countriesList: {
        marginTop: 10,
    },
    countryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#313131',
    },
    selectedCountry: {
        backgroundColor: '#313131',
    },
    countryFlag: {
        fontSize: 20,
        marginRight: 12,
    },
    countryName: {
        color: Color.colorWhite,
        fontSize: FontSize.textRegular_size,
    },
    passionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        gap: 8,
    },
    passionChip: {
        backgroundColor: '#313131',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    passionChipSelected: {
        backgroundColor: '#5468FF',
    },
    passionText: {
        color: Color.colorWhite,
        fontSize: FontSize.textRegular_size,
    },
    consentContainer: {
        marginTop: 20,
    },
    consentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#313131',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#5468FF',
        borderColor: '#5468FF',
    },
    consentText: {
        flex: 1,
        color: Color.colorWhite,
        fontSize: FontSize.textRegular_size,
        lineHeight: 20,
    },
    whiteButton: {
        backgroundColor: Color.colorWhite,
    },
    blackButtonText: {
        color: Color.colorBlack,
    },
    buttonLayout: {
        shadowColor: "rgba(0, 0, 0, 0.25)",
        shadowOffset: {
            width: 0,
            height: 4
        },
        shadowRadius: 4,
        elevation: 4,
        shadowOpacity: 1,
        backgroundColor: Color.colorWhite,
        height: 45,
        marginTop: 20,
        borderRadius: Border.br_3xs,
        overflow: "hidden",
        alignSelf: 'center',
        width: '90%',
    },
    nextButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: Border.br_3xs,
    },
    nextButtonText: {
        color: Color.colorBlack,
        fontWeight: 'bold',
    },
});

export default styles;