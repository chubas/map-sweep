var SC = {};

Class(SC, 'App').inherits(Widget)({
    prototype : {
        init : function(config) {
            Widget.prototype.init.call(this, config);
            this.polygonDraw = new PolygonDraw({
                map : this.map
            });
        }
    }
});

$(function() {
    window.app = new SC.App({
        map : $('.map')
    });
});
