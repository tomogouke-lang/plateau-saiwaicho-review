(function(){
  "use strict";

  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const yen=value=>Math.round(value).toLocaleString("ja-JP")+"円";
  const statusClass=value=>/多数/.test(value)?"status-many":/[123１２３]名/.test(value)?"status-few":/空き無し|なし|無し/.test(value)?"status-none":"status-info";
  const statusMark=value=>/多数/.test(value)?"○":/[123１２３]名/.test(value)?"△":/空き無し|なし|無し/.test(value)?"×":"・";

  function renderAvailability(){
    document.querySelectorAll("[data-pds-availability]").forEach(root=>{
      root.innerHTML=`<div class="availability-toolbar">
          <p class="availability-status" id="availabilityMessage">空き状況を読み込んでいます…</p>
          <div class="availability-legend" aria-label="空き状況の見方"><span class="legend-many">○ 多数</span><span class="legend-few">△ 1〜3名</span><span class="legend-none">× 空きなし</span></div>
        </div><div class="availability-grid" id="availabilityGrid" aria-live="polite"></div>`;
    });
  }

  function renderPrice(){
    document.querySelectorAll("[data-pds-simulator]").forEach(root=>{
      root.innerHTML=`<div class="form-grid">
        <label>利用区分<select id="serviceType"><option value="daycare">通所介護</option><option value="preventive1">介護予防型（週1回程度）</option><option value="preventive2">介護予防型（週2回程度）</option><option value="relief1">基準緩和型（週1回程度）</option><option value="relief2">基準緩和型（週2回程度）</option></select></label>
        <label id="careLevelField">介護度<select id="careLevel"><option value="1">要介護1</option><option value="2">要介護2</option><option value="3">要介護3</option><option value="4">要介護4</option><option value="5">要介護5</option></select></label>
        <label id="timeSlotField">利用時間<select id="timeSlot"><option value="short6">6時間以上7時間未満</option><option value="short5">5時間以上6時間未満</option><option value="short4">4時間以上5時間未満</option><option value="short3">3時間以上4時間未満</option></select></label>
        <label>負担割合<select id="burden"><option value="1">1割負担</option><option value="2">2割負担</option><option value="3">3割負担</option></select></label>
        <label id="weeklyField">週の利用回数<select id="weekly"><option value="1">週1回程度</option><option value="2">週2回程度</option><option value="3">週3回程度</option><option value="4">週4回程度</option><option value="5">週5回程度</option></select></label>
        <label>食事<select id="lunch"><option value="yes">昼食あり（1食630円）</option><option value="no">昼食なし</option></select></label>
        <label>送迎<select id="transport"><option value="0">送迎あり</option><option value="1">片道のみ送迎なし</option><option value="2">往復とも送迎なし</option></select></label>
        <label id="bathField">入浴<select id="bath"><option value="yes">入浴あり</option><option value="no">入浴なし</option></select></label>
        <label id="trainingField">個別機能訓練<select id="training"><option value="yes">あり</option><option value="no">なし</option></select></label>
      </div><div class="estimate-result"><strong id="totalPrice"></strong><small>この金額は概算です。実際の利用料は契約内容・各種加算・利用状況で変わります。</small><ul class="price-breakdown" id="breakdown"></ul></div>`;
    });
  }

  function initAvailability(config){
    const grid=document.getElementById("availabilityGrid");
    const message=document.getElementById("availabilityMessage");
    if(!grid||!message) return;
    let settled=false;
    const fail=()=>{
      if(settled) return;
      grid.innerHTML='<div class="availability-error"><strong>空き状況を表示できませんでした</strong><span>見学・利用開始はお電話でご確認ください。</span></div>';
      message.textContent="空き状況を読み込めませんでした。見学・利用開始はお電話でご確認ください。";
    };
    window.__pdsSaiwaichoAvailability=response=>{
      try{
        const rows=(response.table?.rows||[]).map(row=>({
          day:row.c?.[0]?.v||"",facility:row.c?.[1]?.v||"",bath:row.c?.[2]?.v||""
        })).filter(row=>config.openDays.includes(String(row.day)));
        if(!rows.length) return fail();
        grid.innerHTML=rows.map(row=>`<article class="availability-day">
          <h3><span>${escapeHtml(row.day)}</span>曜日</h3>
          <div class="availability-main"><strong class="availability-badge availability-badge--main ${statusClass(String(row.facility))}"><i aria-hidden="true">${statusMark(String(row.facility))}</i>${escapeHtml(row.facility||"要確認")}</strong></div>
          <div class="availability-bath"><span class="availability-label">入浴</span><strong class="availability-badge ${statusClass(String(row.bath))}"><i aria-hidden="true">${statusMark(String(row.bath))}</i>${escapeHtml(row.bath||"要確認")}</strong></div>
        </article>`).join("");
        settled=true;
        message.textContent="幸町店の入力表から表示しています。利用開始前はお電話でもご確認ください。";
      }catch(error){fail();}
    };
    const script=document.createElement("script");
    script.src=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(config.sheetId)}/gviz/tq?gid=${Number(config.gid)}&tqx=out:json;responseHandler:__pdsSaiwaichoAvailability`;
    script.onerror=fail;
    document.body.appendChild(script);
    window.setTimeout(fail,5000);
  }

  function initPrice(config){
    const byId=id=>document.getElementById(id);
    const service=byId("serviceType");
    if(!service) return;
    const care=byId("careLevel"), time=byId("timeSlot"), burden=byId("burden"), weekly=byId("weekly"), transport=byId("transport"), lunch=byId("lunch"), bath=byId("bath"), training=byId("training");
    const careField=byId("careLevelField"), timeField=byId("timeSlotField"), weeklyField=byId("weeklyField"), bathField=byId("bathField"), trainingField=byId("trainingField");
    const total=byId("totalPrice"), breakdown=byId("breakdown");
    function calculate(){
      const isDaycare=service.value==="daycare";
      [careField,timeField,weeklyField,bathField,trainingField].forEach(field=>field?.classList.toggle("hidden",!isDaycare));
      const rate=Number(burden.value);
      const visits=isDaycare?Math.round(Number(weekly.value)*4.3):Number(config.preventiveVisits[service.value]);
      let insurance=0,monthly=0,bathChange=0,trainingChange=0;
      if(isDaycare){
        const slot=config.daycare[time.value];
        insurance=slot.fees[rate][Number(care.value)-1]*visits;
        if(bath.value==="yes"&&!slot.bathIncluded) bathChange=config.bathFee*rate*visits;
        if(bath.value!=="yes"&&slot.bathIncluded) bathChange=-config.bathFee*rate*visits;
        if(training.value!=="yes") trainingChange=-config.trainingFee*rate*visits;
        monthly=config.monthlyAddOns*rate;
        insurance+=bathChange+trainingChange+monthly;
      }else{
        insurance=config.preventive[service.value][rate];
      }
      const meal=lunch.value==="yes"?config.lunchFee*visits:0;
      const transportDeduction=Number(transport.value)*config.transportDeduction*rate*visits;
      const estimate=Math.max(0,insurance+meal-transportDeduction);
      total.textContent=`約 ${yen(estimate)}／月`;
      const rows=[
        ["利用区分",service.options[service.selectedIndex].text],
        ...(isDaycare?[["介護度",care.options[care.selectedIndex].text],["利用時間",time.options[time.selectedIndex].text]]:[]),
        ["月の利用回数目安",`${visits}回`],
        [isDaycare?"介護保険分（加算前）":"介護保険分（月額）",yen(insurance-monthly)],
        ...(isDaycare?[["月単位の加算目安",yen(monthly)]]:[]),
        ["食費目安",yen(meal)],
        ["送迎なしの減算目安",transportDeduction?`−${yen(transportDeduction)}`:yen(0)]
      ];
      breakdown.innerHTML=rows.map(([label,value])=>`<li><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></li>`).join("");
    }
    [service,care,time,burden,weekly,transport,lunch,bath,training].forEach(element=>element?.addEventListener("change",calculate));
    calculate();
  }

  window.PDSSaiwaichoTools={init(config){renderAvailability();renderPrice();initAvailability(config.availability);initPrice(config.pricing);}};
})();
