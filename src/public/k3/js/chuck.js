socket.on("data-server-k3", function (msg) {
    if (msg) {
        let checkData = $('html').attr('data-dpr');
        if (checkData == msg.game) {
            pageno = 0;
            limit = 10;
            page = 1;
            let notResult = msg.data[0];
            let Result = msg.data[1];
            let check = $('#number_result').attr('data-select');
            if (check == 'all') {
                reload_money();
                callListOrder();
                RenderResult(Result.result);
            } else {
                reload_money();
                callAjaxMeJoin();
                RenderResult(Result.result);
            }
            $('#period').text(notResult.period);
            $("#previous").addClass("block-click");
            $("#previous").removeClass("action");
            $("#previous .van-icon-arrow").css("color", "#7f7f7f");
            $("#next").removeClass("block-click");
            $("#next").addClass("action");
            $("#next .van-icon-arrow").css("color", "#fff");
        }
    }
});

function ShowListOrder(list_orders) {
    if (list_orders.length == 0) {
        return $(`#list_order`).html(
            `
            <div data-v-a9660e98="" class="van-empty">
                <div class="van-empty__image">
                    <img src="/images/empty-image-default.png" />
                </div>
                <p class="van-empty__description">No data</p>
            </div>
            `
        );
    }
    let htmls = "";
    let result = list_orders.map((list_orders) => {
        let total = String(list_orders.result).split('');
        let total2 = 0;
        for (let i = 0; i < total.length; i++) {
            total2 += Number(total[i]);
        }

        let html2 = '';
        for (let i = 0; i < total.length; i++) {
            html2 += `
                <div data-v-03b808c2="" class="li img${total[i]}"></div>
            `;
        }

        return (htmls += `
            <div data-v-03b808c2="" class="c-tc item van-row">
                <div data-v-03b808c2="" class="van-col van-col--6">
                    <div data-v-03b808c2="" class="c-tc goItem lh">${list_orders.period}</div>
                </div>
                <div data-v-03b808c2="" class="van-col van-col--4">
                    <div data-v-03b808c2="" class="c-tc goItem lh" style="margin-left:33px;"> ${total2} </div>
                </div>
                <div data-v-03b808c2="" class="van-col van-col--5">
                    <div data-v-03b808c2="" class="c-tc goItem lh">
                        <div data-v-03b808c2="">${(total2 >= 3 && total2 <= 10) ? "Small" : "Big"}</div>
                    </div>
                </div>
                <div data-v-03b808c2="" class="van-col van-col--4">
                    <div data-v-03b808c2="" class="c-tc goItem lh">
                        <div data-v-03b808c2="">${(total2 % 2 == 0) ? "Even" : "Odd"}</div>
                    </div>
                </div>
                <div data-v-03b808c2="" class="van-col van-col--5">
                    <div data-v-03b808c2="" class="goItem c-row c-tc c-row-between c-row-middle">
                        ${html2}
                    </div>
                </div>
            </div>
        `);
    });
    $(`#list_order`).html(htmls);
}

function formateT(params) {
    let result = (params < 10) ? "0" + params : params;
    return result;
}

function timerJoin(params = '') {
    let date = '';
    if (params) {
        date = new Date(Number(params));
    } else {
        date = new Date();
    }
    let years = formateT(date.getFullYear());
    let months = formateT(date.getMonth() + 1);
    let days = formateT(date.getDate());

    let hours = formateT(date.getHours());
    let minutes = formateT(date.getMinutes());
    let seconds = formateT(date.getSeconds());
    return years + '-' + months + '-' + days + ' ' + hours + ':' + minutes + ':' + seconds;
}

function injectCss() {
    let style = document.createElement('style');
    style.type = 'text/css';

    style.appendChild(document.createTextNode(`
        .resultContainer {
            background-color: #f3f1f1;
            padding: .10667rem .26667rem;
            margin-left: .26667rem;
            border-radius: .53333rem;
            font-size: .32rem
        }
        .moneyContainer{
            color:
        }
        .d-none{
            display:none;
        }
        .MyGameRecordList__C-item-r{
            margin-right:40px;
        }
         .order-item {
            transition: height 0.3s ease;
            overflow: hidden;
            position: relative; /* For positioning the expanded content */
            height: 80px; /* Default height */
        }

        .order-item.expanded {
            height: auto; /* Allow height to expand */
        }

        .expanded-content {
            display: none; /* Initially hidden */
        }

        .order-item.expanded .expanded-content {
            display: block; /* Show expanded content when item is expanded */
        }

        .order-item .order-details {
            margin-top: 10px;
        }
        .detail {
            display: flex;
            flex-direction: column; 
            gap: 4px; 
        }
        .order-detail {
            display:flex;
            justify-content:space-between;
            background-color: white;
            border-radius: 5px;
            padding: 4px;
            margin: 0 6px;
        }
         .green{
            color:green;
        }
        .red{
            color:red;
        }
    `));

    document.head.appendChild(style);
}

function GetMyEmerdList(list_orders) {
    injectCss(); // Ensure CSS is injected
    
    if (list_orders.length == 0) {
        return $(`#list_order`).html(
            `
            <div data-v-a9660e98="" class="van-empty">
                <div class="van-empty__image">
                    <img src="/images/empty-image-default.png" />
                </div>
                <p class="van-empty__description">No Data</p>
            </div>
            `
        );
    }
    let htmls = "";
    let result = list_orders.map((list_order,index) => {
        return (htmls += `
            <div class="order-item" data-v-03b808c2="" id="${index}">
                <div data-v-03b808c2="" class="item c-row">
                    <div data-v-03b808c2="" class="c-row c-row-between c-row-middle info">
                        <div data-v-03b808c2="">
                            <div data-v-03b808c2="" class="issueName">
                                ${list_order.stage}
                                <!---->
                                <span data-v-03b808c2="" class="state ${(list_order.status == 1) ? 'green' : 'red'} ${(list_order.status == 0) ? 'd-none' : ''}">${(list_order.status == 1) ? 'Success' : 'Failure'}</span>
                            </div>
                            <div data-v-03b808c2="" class="tiem">${timerJoin(list_order.time)}</div>
                        </div>
                        <div data-v-03b808c2="" class="money ${(list_order.status == 0) ? 'd-none' : ''}">
                            <!---->
                            <span data-v-03b808c2="" class="${(list_order.status == 1) ? 'success' : 'fail'}"> ${(list_order.status == 1) ? '+' : '-'}${(list_order.status == 1) ? list_order.get : list_order.price}.00 </span>
                        </div>
                    </div>
                </div>
                <!---->
                <div class="expanded-content order-details">
                    ${generateOrderDetails(list_order)}
                </div>
            </div>    
        `);
    });
    $(`#list_order`).html(htmls);
    
     const orderItems = document.querySelectorAll('.order-item');
    let currentExpanded = null;

    orderItems.forEach(item => {
        item.addEventListener('click', () => {
            if (currentExpanded && currentExpanded !== item) {
                currentExpanded.style.height = 'auto'; // Reset height of previously expanded item
                currentExpanded.classList.remove('expanded');
            }

            if (item === currentExpanded) {
                // If the same item is clicked, toggle its height
                item.style.height = 'auto'; // Reset to default height
                item.classList.remove('expanded');
                currentExpanded = null;
            } else {
                item.style.height = '450px'; // Set the desired expanded height
                item.classList.add('expanded');
                currentExpanded = item;
            }
        });
    });
}

function generateOrderDetails(list_orders) {
    if (!list_orders || typeof list_orders !== 'object') return '';

    return `
        <div class="detail">
            <span style="overflow:auto; color:black;font-size:20px; float:left;">Details</span>
            <div class="order-detail">
                <span>Order ID</span>
                <span>${list_orders.id_product} <img width="18px" height="15px" src="/images/copy.png" class="m-l-5"></span>
            </div>
            <div class="order-detail">
                <span>Periods</span>
                ${list_orders.stage}
            </div>
            <div class="order-detail">
                <span>Amount Spent</span>
                ${list_orders.money + list_orders.fee}.00
            </div>
            <div class="order-detail">
                <span>Quantity</span>
                ${list_orders.amount}
            </div>
            <div class="order-detail">
                <span>Net Amount</span>
                ${list_orders.money}.00
            </div>
            <div class="order-detail">
                <span>Tax</span>
                ${list_orders.fee}.00
            </div>
            <div class="order-detail">
                <span>Opening Price</span>
                ${list_orders.result}
            </div>
            <div class="order-detail">
                <span>Result</span>
                <div>
                    <div style="display: inline-block; margin-left: 8px;">${list_orders.result}</div>
                    <div style="display: inline-block; margin-left: 8px;">
                        ${list_orders.result === 0 ? "Purple" : list_orders.result === 5 ? "Indigo" : list_orders.result % 2 === 0 ? "Red" : "Green"}
                    </div>
                    <div style="display: inline-block; margin-left: 8px;">
                        ${list_orders.amount < 5 ? "Small" : "Big"}
                    </div>
                </div>
            </div>
            <div class="order-detail">
                <span>Select</span>
                <div>${list_orders.amount < 5 ? "Small" : "Big"}</div>
            </div>
            <div class="order-detail">
                <div>Status</div>
                <strong class="${list_orders.status === 1 ? "green" : list_orders.status === 2 ? "red" : ""}">
                    ${list_orders.status === 1 ? "Success" : list_orders.status === 2 ? "Failure" : ""}
                </strong>
            </div>
            <div class="order-detail">
                <span>Win Or Loss</span>
                <div class="${list_orders.status === 1 ? "green" : list_orders.status === 2 ? "red" : ""}">
                    ${list_orders.status === 1 ? "+" : list_orders.status === 2 ? "-" : ""}
                    ${list_orders.status === 0 ? "" : list_orders.status === 1 && list_orders.bet === 0 ? list_orders.money * 4.5 : list_orders.status === 1 && list_orders.bet === 5 ? list_orders.money * 1.5 : list_orders.status === 1 && list_orders.bet === 't' ? list_orders.money * 4.5 : list_orders.status === 1 && list_orders.result === 0 && list_orders.bet === 'd' ? list_orders.money * 1.5 : list_orders.status === 1 && list_orders.bet === 'd' ? list_orders.money * 2 : list_orders.status === 1 && list_orders.bet === 'x' ? list_orders.money * 1.5 : list_orders.status === 1 && list_orders.result === 5 && list_orders.bet === 'x' ? list_orders.money * 1.5 : list_orders.status === 1 && list_orders.bet === 'l' ? list_orders.money * 2 : list_orders.status === 1 && list_orders.bet === 'n' ? list_orders.money * 2 : list_orders.status === 1 ? list_orders.money * 9 : list_orders.money}
                </div>
            </div>
            <div class="order-detail">
                <span>Time</span>
                ${timerJoin(list_orders.time)}
            </div>
        </div>
    `;
}

function callListOrder() {
    $.ajax({
        type: "POST",
        url: "/api/webapi/k3/GetNoaverageEmerdList",
        data: {
            gameJoin: $('html').attr('data-dpr'),
            pageno: "0",
            pageto: "10",
        },
        dataType: "json",
        success: function (response) {
            let list_orders = response.data.gameslist;
            $("#period").text(response.period);
            $("#number_result").text("1/" + response.page);
            ShowListOrder(list_orders);
            $('.Loading').fadeOut(0);
            let result = String(list_orders[0].result).split('');
            $('.slot-transform:eq(0) .slot-num').attr('class', `slot-num bg${result[0]}`);
            $('.slot-transform:eq(1) .slot-num').attr('class', `slot-num bg${result[1]}`);
            $('.slot-transform:eq(2) .slot-num').attr('class', `slot-num bg${result[2]}`);
        },
    });
}

callListOrder();

function callAjaxMeJoin() {
    $.ajax({
        type: "POST",
        url: "/api/webapi/k3/GetMyEmerdList",
        data: {
            gameJoin: $('html').attr('data-dpr'),
            pageno: "0",
            pageto: "10",
        },
        dataType: "json",
        success: function (response) {
            let data = response.data.gameslist;
            $("#number_result").text("1/" + response.page);
            GetMyEmerdList(data);
            $('.Loading').fadeOut(0);
        },
    });
}


$('#history').click(function (e) { 
    e.preventDefault();
    callListOrder();
    $('.header-history').removeClass('d-none');
    $(this).addClass('block-click action');
    $('#myBet').removeClass('block-click action');
    $('#number_result').attr('data-select', 'all');
    pageno = 0;
    limit = 10;
    page = 1;
    $("#next").removeClass("block-click");
    $("#next").addClass("action");
    $("#next .van-icon-arrow").css("color", "#fff");
    $("#previous").addClass("block-click");
    $("#previous").removeClass("action");
    $("#previous .van-icon-arrow-left").css("color", "#7f7f7f");
});

$('#myBet').click(function (e) { 
    e.preventDefault();
    callAjaxMeJoin();
    $('.header-history').addClass('d-none');
    $(this).addClass('block-click action');
    $('#history').removeClass('block-click action');
    $('#number_result').attr('data-select', 'mybet');
    pageno = 0;
    limit = 10;
    page = 1;
    $("#next").removeClass("block-click");
    $("#next").addClass("action");
    $("#next .van-icon-arrow").css("color", "#fff");
    $("#previous").addClass("block-click");
    $("#previous").removeClass("action");
    $("#previous .van-icon-arrow-left").css("color", "#7f7f7f");
});


var pageno = 0;
var limit = 10;
var page = 1;
$("#next").click(function (e) {
    e.preventDefault();
    let check = $('#number_result').attr('data-select');
    $('.Loading').fadeIn(0);
    $("#previous").removeClass("block-click");
    $("#previous").addClass("action");
    $("#previous .van-icon-arrow-left").css("color", "#fff");
    pageno += 10;
    let pageto = limit;
    let url = '';
    if (check == 'all') {
        url = "/api/webapi/k3/GetNoaverageEmerdList";
    } else {
        url = "/api/webapi/k3/GetMyEmerdList";
    }
    $.ajax({
        type: "POST",
        url: url,
        data: {
            gameJoin: $('html').attr('data-dpr'),
            pageno: pageno,
            pageto: pageto,
        },
        dataType: "json",
        success: async function (response) {
            $('.Loading').fadeOut(0);
            if (response.status === false) {
                pageno -= 10;
                $("#next").addClass("block-click");
                $("#next").removeClass("action");
                $("#next .van-icon-arrow").css("color", "#7f7f7f");
                alertMess(response.msg);
                return false;
            }
            let list_orders = response.data.gameslist;
            $("#period").text(response.period);
            $("#number_result").text(++page + "/" + response.page);
            if (check == 'all') {
                ShowListOrder(list_orders);
            } else {
                GetMyEmerdList(list_orders);
            }
        },
    });
});
$("#previous").click(function (e) {
    e.preventDefault();
    let check = $('#number_result').attr('data-select');
    $('.Loading').fadeIn(0);
    $("#next").removeClass("block-click");
    $("#next").addClass("action");
    $("#next .van-icon-arrow").css("color", "#fff");
    pageno -= 10;
    let pageto = limit;
    let url = '';
    if (check == 'all') {
        url = "/api/webapi/k3/GetNoaverageEmerdList";
    } else {
        url = "/api/webapi/k3/GetMyEmerdList";
    }
    $.ajax({
        type: "POST",
        url: url,
        data: {
            gameJoin: $('html').attr('data-dpr'),
            pageno: pageno,
            pageto: pageto,
        },
        dataType: "json",
        success: async function (response) {
            $('.Loading').fadeOut(0);
            if (page - 1 < 2) {
                $("#previous").addClass("block-click");
                $("#previous").removeClass("action");
                $("#previous .van-icon-arrow-left").css("color", "#7f7f7f");
            }
            if (response.status === false) {
                pageno = 0;
                $("#previous .arr:eq(0)").addClass("block-click");
                $("#previous .arr:eq(0)").removeClass("action");
                $("#previous .van-icon-arrow-left").css("color", "#7f7f7f");
                alertMess(response.msg);
                return false;
            }
            let list_orders = response.data.gameslist;
            $("#period").text(response.period);
            $("#number_result").text(--page + "/" + response.page);
            if (check == 'all') {
                ShowListOrder(list_orders);
            } else {
                GetMyEmerdList(list_orders);
            }
        },
    });
});
