(function($) {
    $.fn.lawPeriod = function() {
        var that = this;
        var template = null;
        var data = new Array();

        $.getValues("settings", function(d) {
            data = d;
        });

        $.getValues("speed", function(d) {
            data.laws = d;
            renderPeriods(that, data, template);
        });
        $.get("templates/law-period.html", function(t) {
            template = t;
            renderPeriods(that, data, template);
        })

        $(document).on("year-change", function(e, y) {
            if (!data) return;

            // trim first and last year
            var changingYears = data.bigYears.slice(1, data.bigYears.length - 1);

            // get current period
            var period = 1; // because first column is blank
            for (var i = 0; i < changingYears.length; i++) {
                if (y >= changingYears[i]) {
                    period++;
                }
            }

            // highlight current period
            $("#law-periods > div").removeClass("unhighlight-period").addClass("highlight-period").addClass("hidden-xs");
            $("#law-periods > div:eq(" + period + ")").removeClass("highlight-period").addClass("unhighlight-period").removeClass("hidden-xs");
        });
    };

    function renderPeriods(that, data, template) {
        if (!data) return;
        if (!template) return;

        var input = $(Mustache.render(template, data));
        var lawPeriods = $("#law-periods");
        that.html(input);
    }
}(jQuery));
