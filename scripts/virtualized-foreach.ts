(function () {
    var globarRef = null;

    ko.bindingHandlers["virtualized-foreach"] = {
        init(element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {

            return ko.bindingHandlers['foreach']['init'](element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
        },
        update(element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
            let array = ko.unwrap(valueAccessor());
            // get parameters
            let rowHeight = allBindingsAccessor.get("virtualized-foreach-row-height") || 0;
            let columnWidth = allBindingsAccessor.get("virtualized-foreach-column-width") || 0;
            let orientation = allBindingsAccessor.get("virtualized-foreach-orientation") || 'vertical';

            // get scroll values and handle scroll changes
            let scrollTop = ko.observable(element.parentElement.scrollTop);
            let scrollLeft = ko.observable(element.parentElement.scrollLeft);

            // TRY #1
            // function handleScroll() {
            //     scrollTop(this.scrollTop);
            //     console.log(scrollTop());

            //     scrollLeft(this.scrollLeft);
            //     console.log(scrollLeft());

            //     console.log(this.clientHeight);
            // };
            // element.parentElement.removeEventListener("scroll", globarRef);
            // globarRef = handleScroll;
            // element.parentElement.addEventListener("scroll", globarRef);

            // TRY #2
            // function handleScroll(srollableWrapperElement: HTMLElement, scrollTopObservable: KnockoutObservable<number>) {
            //     var scroll = srollableWrapperElement.scrollTop;
            //     scrollTopObservable(scroll);
            //     console.log(scroll);
            //     console.log(srollableWrapperElement.clientHeight);
            // };
            // element.parentElement.addEventListener("scroll", () => handleScroll(element.parentElement, scrollTop));

            let scrollHandler = element.parentElement['dotvvmVirtualForeachScroll'];
            if (scrollHandler) {
                element.parentElement.removeEventListener("scroll", scrollHandler);
            }

            scrollHandler = () => {
                scrollTop(element.parentElement.scrollTop);
                console.log(scrollTop());
    
                scrollLeft(element.parentElement.scrollLeft);
                console.log(scrollLeft());
    
                console.log(element.parentElement.clientHeight);
            };
            element.parentElement.addEventListener("scroll", scrollHandler);
            element.parentElement['dotvvmVirtualForeachScroll'] = scrollHandler;

            // TRY #3
            //function handleScroll() ;

            //let va=() => {return {scroll: handleScroll}};
            //ko.bindingHandlers.event.init(element.parentElement, va, allBindingsAccessor, viewModel, bindingContext);

            // get size of element visible on display
            console.log("u" + element.parentElement.clientHeight);
            let visibleHeight = ko.observable(element.parentElement.clientHeight);
            let visibleWidth = ko.observable(element.parentElement.clientWidth);

            // create sub array and calculate paddings
            let visibleArray = ko.computed(() => getVisibleSubArray(element, scrollTop, scrollLeft, rowHeight, columnWidth, visibleHeight, visibleWidth, array, orientation));

            // alert("update");

            // create foreach binding with only subarray items
            let foreachResult = ko.bindingHandlers['foreach']['update'](element, () => visibleArray, allBindingsAccessor, viewModel, bindingContext);

            // update size of element visible on display (before foreach binding creatating it was 0)
            console.log("a" + element.parentElement.clientHeight);
            visibleHeight(element.parentElement.clientHeight);
            visibleWidth(element.parentElement.clientWidth);

            return foreachResult;
        }
    }

    function getVisibleSubArray(element: HTMLElement, scrollTop: KnockoutObservable<number>, scrollLeft: KnockoutObservable<number>,
        rowHeight: number, columnWidth: number, visibleHeight: KnockoutObservable<number>, visibleWidth: KnockoutObservable<number>,
        array: any, orientation: string) {

        console.log("c" + element.parentElement.clientHeight);
        const itemsOverplusCount = 3;
        let startIndex = 0;
        let visibleElementsCount: number;
        let arrayLength = array.length || 0;

        if (orientation.toLowerCase() === 'horizontal') {
            // TODO: calculate based on itemsOverplusCount
            if (scrollLeft() > columnWidth) {
                startIndex = Math.floor(scrollLeft() / columnWidth) - 1;
            }
            else {
                startIndex = 0;
            }
            visibleElementsCount = Math.floor(visibleWidth() / columnWidth) + itemsOverplusCount;
            if (visibleElementsCount + startIndex > arrayLength) {
                visibleElementsCount = arrayLength - startIndex;
            }
            element.style.paddingLeft = startIndex * columnWidth + "px";
            // element.style.paddingRight = (arrayLength - startIndex - visibleElementsCount) * columnWidth + "px";
            element.style.width = arrayLength * columnWidth - startIndex * columnWidth + "px";
        }
        else {
            // TODO: calculate based on itemsOverplusCount
            if (scrollTop() > rowHeight) {
                startIndex = Math.floor(scrollTop() / rowHeight) - 1;
            }
            else {
                startIndex = 0;
            }
            visibleElementsCount = Math.floor(visibleHeight() / rowHeight) + itemsOverplusCount;
            if (visibleElementsCount + startIndex > arrayLength) {
                visibleElementsCount = arrayLength - startIndex;
            }
            element.style.paddingTop = startIndex * rowHeight + "px";
            element.style.paddingBottom = (arrayLength - startIndex - visibleElementsCount) * rowHeight + "px";
        }
        // alert(`startIndex:${startIndex()} visibleElementsCount:${visibleElementsCount} arrayLength:${arrayLength} visibleHeight:${visibleHeight} elementClientHeight:${element.clientHeight} elementChildren:${element.childElementCount}`);
        if(Array.isArray(array)) {
            return array.slice(startIndex, startIndex + visibleElementsCount);
        }
        return array;
    }

    /*
    - Mode = Vertical | Horizontal ✅
    - Na začátku zjistit defaultní padding boxu a připočítávat ho
    - Správně reagovat na resize elementu ❓
    - Ujistit se, že zásah do kolekce GridData nebo její nahrazení jinou kolekcí se propíše do komponenty
    - Ověřit, že se to chová dobře na mobilech

    Bonus
    - Změřit si zobrazené elementy a zařídit se podle toho


    */

})();