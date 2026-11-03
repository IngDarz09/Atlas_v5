(function () {
    'use strict';
    const PALETTE = ['#872341','#b88b5b','#256259','#3f9882','#961638','#dcb993','#ac1a33','#0d312d','#afafaf','#262626','#b88b5b','#256259'];
    const fmt = new Intl.NumberFormat('es-MX');
    const percent = (n,d) => d ? (100*n/d).toLocaleString('es-MX',{minimumFractionDigits:1,maximumFractionDigits:1})+' %' : '—';
    const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const zero = () => [0,0,0,0,0,0,0];
    const add = (a,row) => { for(let i=0;i<7;i++) a[i]+=row[10+i]; return a; };
    const svgIcon = (name,size=22) => {
        const solid={
            people:'<circle cx="12" cy="6" r="3.1"/><circle cx="4.5" cy="7.5" r="2.5"/><circle cx="19.5" cy="7.5" r="2.5"/><path d="M6.5 21v-6a5.5 5.5 0 0 1 11 0v6zM0 20v-5a4.5 4.5 0 0 1 6.4-4.1A7.5 7.5 0 0 0 4.5 16v4zm24 0h-4.5v-4a7.5 7.5 0 0 0-1.9-5.1A4.5 4.5 0 0 1 24 15z"/>',
            man:'<circle cx="12" cy="3.5" r="2.8"/><path d="M8 7h8a2 2 0 0 1 2 2v6a1.2 1.2 0 0 1-2.4 0v-5h-.8v12.5a1.4 1.4 0 0 1-2.8 0V16h-1v6.5a1.4 1.4 0 0 1-2.8 0V10h-.8v5a1.2 1.2 0 0 1-2.4 0V9a2 2 0 0 1 2-2z"/>',
            woman:'<circle cx="12" cy="3.5" r="2.8"/><path d="M9 7h6l3.5 8a1.1 1.1 0 0 1-2 .9L14.8 12l2.7 7h-3v3.7a1.2 1.2 0 0 1-2.4 0V19h-.2v3.7a1.2 1.2 0 0 1-2.4 0V19h-3l2.7-7-1.7 3.9a1.1 1.1 0 0 1-2-.9z"/>',
            teacher:'<path d="M10 2h14v14H13v-2h9V4H10zM15 6h5v2h-5z"/><circle cx="6" cy="6" r="2.8"/><path d="M3 10h5l7-4 1.3 2.1-7 4.3V23H6.5v-7H5v7H2.2V13H1v5H0v-5a3 3 0 0 1 3-3z"/>'
        };
        if(solid[name])return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="currentColor">'+solid[name]+'</svg>';
        const paths={chart:'<path d="M3 20h4V11H3zm7 0h4V5h-4zm7 0h4V1h-4z" fill="currentColor" stroke="none"/>',school:'<path d="M3 21V9l9-6 9 6v12H3Zm0-12h18M9 21v-6h6v6M7 11v2m10-2v2M12 7v3m-1-2h2"/>',people:'<circle cx="9" cy="7" r="3"/><circle cx="18" cy="8" r="2"/><path d="M2 21v-4a7 7 0 0 1 14 0v4m1-7a5 5 0 0 1 5 5v2"/>',person:'<circle cx="12" cy="5" r="3"/><path d="M6 15v-4h12v4m-8-4v12m4-12v12"/>',teacher:'<path d="M11 3h11v13H12M15 7h4m-4 4h3M2 23v-6a4 4 0 0 1 8 0v6M6 14l8-6"/><circle cx="6" cy="8" r="3"/>',reset:'<path d="M3 10a9 9 0 1 1 1 9M3 4v6h6"/>',compare:'<path d="M4 6h16m-4-4 4 4-4 4M20 18H4m4-4-4 4 4 4"/>',pdf:'<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 13h8m-8 4h8"/>'};
        return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.chart)+'</svg>';
    };
    let data=null, loadPromise=null, dialog=null, opener=null, exportBusy=false, reportUrl=null;
    let geometry={}, lastResults=null;
    const state={kind:'estado',id:'',filters:{turno:'',tipo:'',nivel:'',subnivel:'',control:'',subcontrol:'',sostenimiento:''},compare:false};
    const columns={municipio:0,macro:1,micro:2,turno:3,tipo:4,nivel:5,subnivel:6,control:7,subcontrol:8,sostenimiento:9};
    const labels={estado:'Panorama estatal',municipio:'Municipio',macro:'Macrorregión',micro:'Microrregión',turno:'Turno',tipo:'Tipo educativo',nivel:'Nivel educativo',subnivel:'Subnivel',control:'Control',subcontrol:'Subcontrol',sostenimiento:'Sostenimiento'};
    const levelOrder=['Inicial','Inicial No Escolarizada','Inicial No Escolarizada (CONAFE)','Inicial No Escolarizada (CCAPI)','Preescolar','Primaria','Secundaria','Bachillerato','Profesional Técnico','Profesional Técnico Bachiller','Superior','Educación Especial'];
    const $ = s => dialog.querySelector(s);
    function featureKey(p) {
        if(p.Municipio||p.NOM_MUN) return 'municipio:'+String(Number(p.CVE_MUN||String(p.CVEGEO).slice(-3)));
        if(p.id_micro) return 'micro:'+Number(p.id_micro);
        if(p.id_macro) return 'macro:'+Number(p.id_macro);
        return null;
    }
    // Read polygon data only for the miniature; never access or modify map layers.
    function collectGeometries() {
        geometry={};
        Object.keys(window).filter(k=>/^json_/.test(k)).forEach(k=>{
            const g=window[k]; if(!g||!g.features) return;
            g.features.forEach(f=>{const key=featureKey(f.properties||{}); if(key)(geometry[key]||(geometry[key]=[])).push(f);});
        });

    }
    function territoryName(kind=state.kind,id=state.id) {
        if(kind==='estado') return 'Estado de Puebla';
        const raw=data.territorios[kind][id]||id;
        return kind==='micro'&&!/^\d+\s*-/.test(raw)?id+' - '+raw:kind==='macro'?id+' - '+raw:raw;
    }
    function territoryRows(kind=state.kind,id=state.id,excludeFilter='') {
        return data.filas.filter(r=>{
            if(kind!=='estado'&&r[columns[kind]]!==Number(id)) return false;
            return Object.entries(state.filters).every(([k,v])=>k===excludeFilter||v===''||r[columns[k]]===Number(v));
        });
    }
    function sum(rows) {return rows.reduce(add,zero());}
    function grouped(rows,dimension,metric) {
        const groups=new Map();
        rows.forEach(r=>groups.set(r[columns[dimension]],(groups.get(r[columns[dimension]])||0)+r[10+metric]));
        return Array.from(groups,([id,value])=>({id,name:data.categorias[dimension][id],value})).sort((a,b)=>dimension==='nivel'?levelOrder.indexOf(a.name)-levelOrder.indexOf(b.name):dimension==='control'?(a.name==='Público'?-1:1):b.value-a.value);
    }
    function options(items,value,all='Todos') {
        return (all===null?'':'<option value="">'+all+'</option>')+items.map(x=>'<option value="'+esc(x.id)+'"'+(String(value)===String(x.id)?' selected':'')+'>'+esc(x.name)+'</option>').join('');
    }
    function territoryOptions(kind,value,blank=false) {
        return options(Object.entries(data.territorios[kind]||{}).sort((a,b)=>kind==='municipio'?a[1].localeCompare(b[1],'es'):Number(a[0])-Number(b[0])).map(([id])=>({id,name:territoryName(kind,id)})),value,blank?'Sin comparar':null);
    }
    function geometrySVG(features,width=130,height=110,fill='#872341',shadow=true) {
        const projected=[];
        features.forEach(f=>{
            const g=f.geometry;if(!g||!['Polygon','MultiPolygon'].includes(g.type))return;
            const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;
            polygons.forEach(poly=>projected.push(poly.map(ring=>ring.map(([lng,lat])=>[lng,-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))*180/Math.PI]))));
        });
        if(!projected.length)return '';
        let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
        projected.forEach(poly=>poly.forEach(r=>r.forEach(([x,y])=>{minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}))); 
        const pad=8,s=Math.min((width-pad*2)/(maxX-minX||1),(height-pad*2)/(maxY-minY||1));
        const dx=(width-(maxX-minX)*s)/2,dy=(height-(maxY-minY)*s)/2;
        const path=projected.map(poly=>poly.map(ring=>{
            let last=null,points=[];
            ring.forEach(([x,y],i)=>{const q=[(x-minX)*s+dx,(y-minY)*s+dy];if(!last||Math.hypot(q[0]-last[0],q[1]-last[1])>.45||i===ring.length-1){points.push(q);last=q;}});
            return points.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join('')+'Z';
        }).join('')).join('');
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Silueta del territorio seleccionado">'+(shadow?'<path d="'+path+'" fill="#eaeaea" fill-rule="evenodd" transform="translate(3,-3)"/>':'')+'<path d="'+path+'" fill="'+fill+'" fill-rule="evenodd"/></svg>';
    }
    function currentFeatures(kind=state.kind,id=state.id) {
        if(kind==='estado')return Object.keys(geometry).filter(k=>k.startsWith('macro:')).flatMap(k=>geometry[k]);
        return geometry[kind+':'+id]||[];
    }
    function build() {
        dialog=document.createElement('dialog');dialog.id='atlas-analisis';dialog.setAttribute('aria-labelledby','ae-title');
        dialog.innerHTML=`<div class="ae-shell"><header class="ae-header">${svgIcon('chart',38)}<div><h2 id="ae-title">Análisis estadístico</h2><p>Consulta la información educativa de manera interactiva</p></div><button type="button" class="ae-close" aria-label="Cerrar análisis estadístico">×</button></header><div class="ae-scroll"><div class="ae-loading"><span class="ae-spinner"></span><br>Preparando la consulta estadística…</div><div class="ae-content" hidden>
        <div class="ae-territory-chooser"><div class="ae-field"><label for="ae-kind">Ámbito territorial</label><select id="ae-kind"><option value="estado">Panorama estatal</option><option value="macro">Macrorregiones</option><option value="micro">Microrregiones</option><option value="municipio">Municipios</option></select></div><div class="ae-field"><label for="ae-territory">Territorio</label><select id="ae-territory"></select></div></div>
        <div class="ae-top"><section class="ae-territory ae-card" aria-label="Territorio seleccionado"><div><h3>Territorio seleccionado</h3><div class="ae-territory-name"></div><div class="ae-territory-sub"></div></div><div class="ae-mini"></div></section><section class="ae-filters ae-card"><h3>Filtros de análisis</h3><div class="ae-filter-grid">${['nivel','control','turno'].map(k=>`<div class="ae-field"><label for="ae-${k}">${labels[k]}</label><select id="ae-${k}" data-filter="${k}"></select></div>`).join('')}<div class="ae-field"><label for="ae-period">Ciclo escolar</label><select id="ae-period" disabled><option>Inicio 2025–2026</option></select></div></div><details><summary>Más filtros: tipo, subnivel y sostenimiento</summary><div class="ae-extra-grid">${['tipo','subnivel','subcontrol','sostenimiento'].map(k=>`<div class="ae-field"><label for="ae-${k}">${labels[k]}</label><select id="ae-${k}" data-filter="${k}"></select></div>`).join('')}</div></details></section></div>
        <div class="ae-active" aria-label="Filtros activos"></div><section class="ae-kpis" aria-label="Indicadores de la consulta"></section>
        <section class="ae-comparison ae-card" hidden aria-labelledby="ae-compare-title"><h3 id="ae-compare-title">Comparar territorios</h3><p>Compara hasta tres territorios del mismo ámbito con los filtros activos. Los porcentajes de mujeres se calculan dentro de cada territorio.</p><div class="ae-compare-fields"><div class="ae-field"><label for="ae-compare-kind">Ámbito</label><select id="ae-compare-kind"><option value="macro">Macrorregiones</option><option value="micro">Microrregiones</option><option value="municipio">Municipios</option></select></div>${[0,1,2].map(i=>`<div class="ae-field"><label for="ae-compare-${i}">Territorio ${i+1}</label><select id="ae-compare-${i}"></select></div>`).join('')}</div><div class="ae-table-wrap"></div><div class="ae-compare-chart"></div></section>
        <section class="ae-chart-grid" aria-label="Gráficas de la consulta">${[['schools-level','Escuelas por nivel educativo',true],['enrollment-level','Matrícula por nivel educativo',true],['schools-control','Escuelas por control',true],['enrollment-control','Matrícula por control',true],['enrollment-shift','Matrícula por turno',true],['teachers-sex','Docentes por sexo',false]].map(([id,title,interactive])=>`<article class="ae-chart-card ae-card" data-chart="${id}"><h3>${title}</h3><p class="ae-chart-hint">${interactive?'Selecciona una categoría para aplicar un filtro':'Incluye directivos con grupo'}</p><div class="ae-chart"></div><div class="ae-legend"></div></article>`).join('')}</section>
        <p class="ae-status" role="status" aria-live="polite"></p><p class="ae-note">Fuente: estadística educativa de la SEP Puebla. Corte: <strong>Inicio 2025–2026</strong>. Docentes incluye directivos con grupo. «Escuelas» corresponde al recuento de registros estadísticos acordado para esta edición. Los porcentajes se calculan con la consulta filtrada. Las gráficas muestran la base estadística incorporada; los datos de las fichas cartográficas originales se conservan.</p></div></div>
        <footer class="ae-footer"><button type="button" class="ae-action" data-action="reset">${svgIcon('reset',17)}Limpiar filtros</button><button type="button" class="ae-action" data-action="compare" aria-expanded="false">${svgIcon('compare',18)}Comparar territorios</button><button type="button" class="ae-action ae-primary" data-action="pdf">${svgIcon('pdf',18)}Generar reporte PDF</button><div class="ae-footer-credit"><span>Atlas de Planeación y Estadística Educativa 2026 · SEP Puebla</span><span>Elaboración e integración: Ing. Diego Armando Rivera Zárate</span></div></footer></div>`;
        document.body.appendChild(dialog);
        dialog.querySelectorAll('[data-action]').forEach(button=>button.disabled=true);
        $('.ae-close').addEventListener('click',()=>dialog.close());
        dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
        dialog.addEventListener('close',()=>{if(opener)opener.focus({preventScroll:true});});
        $('#ae-kind').addEventListener('change',e=>{
            state.kind=e.target.value;state.id=state.kind==='estado'?'':Object.keys(data.territorios[state.kind]).sort((a,b)=>Number(a)-Number(b))[0];updateTerritory();render();
        });
        $('#ae-territory').addEventListener('change',e=>{state.id=e.target.value;updateTerritory();render();});
        dialog.querySelectorAll('[data-filter]').forEach(s=>s.addEventListener('change',()=>setFilter(s.dataset.filter,s.value)));
        dialog.addEventListener('click',e=>{
            const chip=e.target.closest('[data-clear]');if(chip){setFilter(chip.dataset.clear,'');return;}
            const action=e.target.closest('[data-action]');if(!action)return;
            if(action.dataset.action==='reset'){Object.keys(state.filters).forEach(k=>state.filters[k]='');render();}
            if(action.dataset.action==='compare'){state.compare=!state.compare;$('.ae-comparison').hidden=!state.compare;action.setAttribute('aria-expanded',String(state.compare));if(state.compare){initComparison();$('.ae-comparison').scrollIntoView({block:'nearest',behavior:'smooth'});}}
            if(action.dataset.action==='pdf')exportPDF();
        });
        $('#ae-compare-kind').addEventListener('change',()=>initComparison(true));
        [0,1,2].forEach(i=>$('#ae-compare-'+i).addEventListener('change',renderComparison));
    }
    function setFilter(key,value) {
        state.filters[key]=value;
        if(key==='nivel')state.filters.subnivel='';
        if(key==='tipo'){state.filters.nivel='';state.filters.subnivel='';}
        if(key==='control'){state.filters.subcontrol='';state.filters.sostenimiento='';}
        if(key==='subcontrol')state.filters.sostenimiento='';
        render();
    }
    function updateTerritory() {
        if(!data)return;
        $('#ae-kind').value=state.kind;const sel=$('#ae-territory');
        sel.innerHTML=state.kind==='estado'?'<option value="">Estado de Puebla</option>':territoryOptions(state.kind,state.id);sel.disabled=state.kind==='estado';
        $('.ae-territory-name').textContent=territoryName();
        const rows=data.filas.filter(r=>state.kind==='estado'||r[columns[state.kind]]===Number(state.id));
        const macros=Array.from(new Set(rows.map(r=>r[1]))),micros=Array.from(new Set(rows.map(r=>r[2])));
        let detail=state.kind==='estado'?'7 macrorregiones · 31 microrregiones · 217 municipios':labels[state.kind];
        if(state.kind==='municipio')detail+=' · '+(macros.length===1?data.territorios.macro[macros[0]]:macros.length+' macrorregiones')+' · '+micros.length+' '+(micros.length===1?'microrregión':'microrregiones');
        if(state.kind==='micro'&&macros.length===1)detail+=' · '+data.territorios.macro[macros[0]];
        if(state.kind==='macro')detail+=' · '+micros.length+' microrregiones';
        $('.ae-territory-sub').textContent=detail;
        $('.ae-mini').innerHTML=geometrySVG(currentFeatures());
    }
    function renderFilters() {
        Object.keys(state.filters).forEach(key=>{
            const available=new Set(territoryRows(state.kind,state.id,key).map(r=>r[columns[key]]));
            const items=data.categorias[key].map((name,id)=>({id,name})).filter(x=>available.has(x.id)||String(x.id)===String(state.filters[key]));
            $('#ae-'+key).innerHTML=options(items,state.filters[key]);
        });
        const active=Object.entries(state.filters).filter(([k,v])=>v!=='');
        $('.ae-active').innerHTML=active.length?active.map(([k,v])=>'<span class="ae-chip">'+esc(labels[k])+': '+esc(data.categorias[k][v])+'<button type="button" data-clear="'+k+'" aria-label="Quitar filtro '+esc(labels[k])+'">×</button></span>').join(''):'';
    }
    function kpis(t) {
        const items=[['school','Escuelas',t[0],'','#b88b5b','#f7f3ed'],['people','Matrícula total',t[1],'','#256259','#edf5f2'],['man','Hombres',t[3],percent(t[3],t[1]),'#256259','#edf5f2'],['woman','Mujeres',t[2],percent(t[2],t[1]),'#872341','#f8eff2'],['teacher','Docentes',t[4],'H: '+fmt.format(t[6])+' | M: '+fmt.format(t[5]),'#b88b5b','#f7f3ed']];
        $('.ae-kpis').innerHTML=items.map(([icon,label,val,sub,tone,tint])=>`<article class="ae-card ae-kpi" style="--tone:${tone};--tint:${tint}"><div class="ae-kpi-icon">${svgIcon(icon,35)}</div><div><div class="ae-kpi-label">${label}</div><div class="ae-kpi-value">${fmt.format(val)}</div>${sub?`<div class="ae-kpi-detail">${sub}</div>`:''}</div></article>`).join('');
    }
    function bars(items,dimension,metricLabel,forPDF=false) {
        const W=430, left=154, right=64, top=9, step=items.length>8?25:34,H=Math.max(190,items.length*step+24),max=Math.max(...items.map(x=>x.value),1),total=items.reduce((s,x)=>s+x.value,0);
        if(!items.length)return '';
        let content='<line x1="'+left+'" y1="0" x2="'+left+'" y2="'+(H-15)+'" stroke="#eaeaea"/>';
        items.forEach((item,i)=>{
            const y=top+i*step,bar=(W-left-right)*item.value/max,color=PALETTE[i%PALETTE.length],full=item.name+': '+fmt.format(item.value)+' '+metricLabel+' ('+percent(item.value,total)+')';
            const lines=[];let line='';item.name.split(' ').forEach(word=>{if((line+' '+word).trim().length>25&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();});if(line)lines.push(line);
            const nameText=lines.map((text,j)=>'<tspan x="'+(left-9)+'" y="'+(y+(lines.length>1?6:14)+j*11)+'">'+esc(text)+'</tspan>').join('');
            content+='<g'+(!forPDF&&dimension?' class="ae-mark" role="button" tabindex="0" data-dim="'+dimension+'" data-value="'+item.id+'" aria-label="Filtrar '+esc(full)+'" aria-pressed="'+(String(state.filters[dimension])===String(item.id))+'"':'')+'><title>'+esc(full)+'</title><text text-anchor="end" font-family="Arial" font-size="'+(lines.length>1?'10':'11')+'" fill="#454545">'+nameText+'</text><rect x="'+left+'" y="'+y+'" width="'+Math.max(0,bar).toFixed(1)+'" height="19" rx="2" fill="'+color+'"/><text x="'+(left+bar+6).toFixed(1)+'" y="'+(y+14)+'" font-family="Arial" font-size="11" fill="#262626">'+fmt.format(item.value)+'</text></g>';
        });
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(metricLabel)+'">'+content+'</svg>';
    }
    function donut(items,total,unit) {
        const cx=125,cy=115,r=77,circ=2*Math.PI*r;let offset=0;
        let content='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#eaeaea" stroke-width="31"/>';
        items.forEach((item,i)=>{const length=total?circ*item.value/total:0;content+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+PALETTE[i%PALETTE.length]+'" stroke-width="31" stroke-dasharray="'+length.toFixed(3)+' '+(circ-length).toFixed(3)+'" stroke-dashoffset="'+(-offset).toFixed(3)+'" transform="rotate(-90 '+cx+' '+cy+')"><title>'+esc(item.name+': '+fmt.format(item.value)+' ('+percent(item.value,total)+')')+'</title></circle>';offset+=length;});
        content+='<text x="'+cx+'" y="112" text-anchor="middle" font-family="Arial" font-weight="700" font-size="25" fill="#262626">'+fmt.format(total)+'</text><text x="'+cx+'" y="133" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">'+unit+'</text>';
        items.forEach((item,i)=>{const y=85+i*65;content+='<circle cx="255" cy="'+(y-4)+'" r="6" fill="'+PALETTE[i%PALETTE.length]+'"/><text x="270" y="'+y+'" font-family="Arial" font-size="13" font-weight="700" fill="#262626">'+esc(item.name)+'</text><text x="270" y="'+(y+19)+'" font-family="Arial" font-size="12" fill="#555">'+fmt.format(item.value)+'</text><text x="270" y="'+(y+36)+'" font-family="Arial" font-size="12" fill="#555">'+percent(item.value,total)+'</text>';});
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 230" role="img" aria-label="Distribución de '+unit+'">'+content+'</svg>';
    }
    function drawChart(id,items,dim,unit,total,style='bars') {
        const card=$('[data-chart="'+id+'"]');
        const chart=card.querySelector('.ae-chart'),legend=card.querySelector('.ae-legend');
        chart.innerHTML=total?style==='donut'?donut(items,total,unit):bars(items,dim,unit):'<p class="ae-empty">Sin datos para esta combinación.<br>Prueba otros filtros o pulsa «Limpiar filtros».</p>';
        const legendItems=total&&dim?items.map((x,i)=>'<button type="button" data-dim="'+dim+'" data-value="'+x.id+'" aria-label="Filtrar '+esc(x.name)+'"><i class="ae-swatch" style="background:'+PALETTE[i%PALETTE.length]+'"></i>'+esc(x.name)+' · '+percent(x.value,total)+'</button>').join(''):'';
        legend.innerHTML=style==='bars'&&legendItems?'<details><summary>Ver categorías y porcentajes</summary><div class="ae-category-list">'+legendItems+'</div></details>':legendItems;
        card.querySelectorAll('[data-dim]').forEach(el=>{
            const apply=()=>setFilter(el.dataset.dim,String(state.filters[el.dataset.dim])===el.dataset.value?'':el.dataset.value);
            el.addEventListener('click',apply);if(el.tagName.toLowerCase()==='g')el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();apply();}});
        });
    }
    function render() {
        if(!data)return;
        const rows=territoryRows(),totals=sum(rows);lastResults={rows,totals};
        renderFilters();kpis(totals);
        drawChart('schools-level',grouped(rows,'nivel',0),'nivel','escuelas',totals[0]);
        drawChart('enrollment-level',grouped(rows,'nivel',1),'nivel','matrícula',totals[1]);
        drawChart('schools-control',grouped(rows,'control',0),'control','Escuelas',totals[0],'donut');
        drawChart('enrollment-control',grouped(rows,'control',1),'control','Matrícula',totals[1],'donut');
        drawChart('enrollment-shift',grouped(rows,'turno',1),'turno','matrícula',totals[1]);
        drawChart('teachers-sex',[{name:'Mujeres',value:totals[5]},{name:'Hombres',value:totals[6]}],null,'Docentes',totals[4],'donut');
        $('.ae-status').textContent=totals[0]?fmt.format(totals[0])+' escuelas en la consulta · '+territoryName():'No hay registros que cumplan los filtros seleccionados.';
        $('.ae-status').dataset.error='false';
        if(state.compare)renderComparison();
    }
    function initComparison(reset=false) {
        const kind=$('#ae-compare-kind');if(!reset)kind.value=state.kind==='estado'?'macro':state.kind;
        const ids=Object.keys(data.territorios[kind.value]).sort((a,b)=>Number(a)-Number(b));
        [0,1,2].forEach(i=>{const id=i===0&&state.kind===kind.value?state.id:i<2?ids[i]:'';$('#ae-compare-'+i).innerHTML=territoryOptions(kind.value,id,true);});renderComparison();
    }
    function comparisonResults() {
        if(!state.compare)return [];
        const kind=$('#ae-compare-kind').value;const ids=Array.from(new Set([0,1,2].map(i=>$('#ae-compare-'+i).value).filter(Boolean)));
        return ids.map(id=>({id,name:territoryName(kind,id),totals:sum(territoryRows(kind,id))}));
    }
    function renderComparison() {
        const results=comparisonResults();
        $('.ae-table-wrap').innerHTML=results.length?'<table class="ae-compare-table"><caption>Resultados con los filtros activos</caption><thead><tr><th>Territorio</th><th>Escuelas</th><th>Matrícula</th><th>Mujeres</th><th>Hombres</th><th>% mujeres</th><th>Docentes</th></tr></thead><tbody>'+results.map(({name,totals:t})=>'<tr><th scope="row">'+esc(name)+'</th><td>'+fmt.format(t[0])+'</td><td>'+fmt.format(t[1])+'</td><td>'+fmt.format(t[2])+'</td><td>'+fmt.format(t[3])+'</td><td>'+percent(t[2],t[1])+'</td><td>'+fmt.format(t[4])+'</td></tr>').join('')+'</tbody></table>':'<p class="ae-empty">Elige al menos un territorio para comparar.</p>';
        $('.ae-compare-chart').innerHTML=results.length?bars(results.map(x=>({name:x.name,value:x.totals[1]})),null,'Matrícula de los territorios comparados'):'';
    }
    function status(message,error=false){$('.ae-status').textContent=message;$('.ae-status').dataset.error=String(error);}
    function ensureScript(src,global) {
        if(window[global])return Promise.resolve();
        return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo cargar '+src));document.head.appendChild(s);});
    }
    async function svgPng(svg,width=1200) {
        const image=new Image();const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
        try {await new Promise((res,rej)=>{image.onload=res;image.onerror=()=>rej(new Error('No se pudo preparar una gráfica'));image.src=url;});const box=svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.round(width*box[3]/box[2]);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);const png=await new Promise(res=>canvas.toBlob(res,'image/png'));return new Uint8Array(await png.arrayBuffer());} finally {URL.revokeObjectURL(url);}
    }
    async function exportPDF() {
        if(exportBusy||!data)return;
        exportBusy=true;const button=$('[data-action="pdf"]');button.disabled=true;status('Preparando el reporte PDF con la consulta actual…');
        // Snapshot before asynchronous rendering: the exported figures stay consistent.
        const snapshot={name:territoryName(),kind:state.kind,period:data.periodo,totals:lastResults.totals.slice(),filters:Object.entries(state.filters).filter(([k,v])=>v!=='').map(([k,v])=>labels[k]+': '+data.categorias[k][v]),mini:geometrySVG(currentFeatures(),130,110),charts:Array.from(dialog.querySelectorAll('[data-chart]')).map(c=>({title:c.querySelector('h3').textContent,svg:c.querySelector('.ae-chart svg')?.outerHTML||null})),comparison:comparisonResults(),date:new Date().toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'})};
        try {
            await ensureScript('js/pdf-lib.min.js','PDFLib');
            const {PDFDocument,StandardFonts,rgb}=window.PDFLib;const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
            pdf.setTitle('Análisis estadístico · '+snapshot.name);pdf.setAuthor('Ing. Diego Armando Rivera Zárate · SEP Puebla');pdf.setSubject('Atlas de Planeación y Estadística Educativa 2026');
            const burgundy=rgb(135/255,35/255,65/255),gray=rgb(.27,.27,.27),light=rgb(.91,.91,.91),W=842,H=595;
            const safe=s=>String(s).replace(/[\u2000-\u200b]/g,' ').replace(/\u202f/g,' ').replace(/→/g,'-').replace(/[^\x20-\x7e\xa0-\xff\u2013\u2014\u2022\u2026]/g,'');
            const txt=(page,s,x,y,size=10,isBold=false,color=gray)=>page.drawText(safe(s),{x,y,size,font:isBold?bold:font,color});
            function wrap(s,maxWidth,size=10,isBold=false){const f=isBold?bold:font,words=safe(s).split(/\s+/),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(f.widthOfTextAtSize(next,size)>maxWidth&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
            function pageBase(number,label){const p=pdf.addPage([W,H]);p.drawRectangle({x:0,y:H-66,width:W,height:66,color:burgundy});txt(p,'Análisis estadístico',28,H-30,21,true,rgb(1,1,1));txt(p,'Atlas de Planeación y Estadística Educativa 2026 · SEP Puebla',28,H-48,10,false,rgb(1,1,1));txt(p,label,28,28,8);txt(p,'Elaboración e integración: Ing. Diego Armando Rivera Zárate',28,15,8);txt(p,'Página '+number,W-72,15,8);return p;}
            let page=pageBase(1,snapshot.period+' · '+snapshot.date);txt(page,snapshot.name,28,H-94,18,true);txt(page,labels[snapshot.kind]+' · '+snapshot.period,28,H-112,10);
            const filterText=snapshot.filters.length?snapshot.filters.join(' · '):'Todos los niveles, controles y turnos';const fl=wrap(filterText,680,9);fl.slice(0,5).forEach((line,i)=>txt(page,line,28,H-131-i*13,9));
            if(snapshot.mini){const png=await pdf.embedPng(await svgPng(snapshot.mini,260));page.drawImage(png,{x:W-107,y:H-157,width:79,height:67});}
            const t=snapshot.totals,kpi=[['Escuelas',t[0]],['Matrícula',t[1]],['Mujeres',t[2]],['Hombres',t[3]],['Docentes',t[4]]];
            kpi.forEach(([name,val],i)=>{const x=28+i*157;page.drawRectangle({x,y:H-244,width:148,height:53,color:rgb(.97,.95,.95)});txt(page,name,x+10,H-208,10);txt(page,fmt.format(val),x+10,H-232,20,true,burgundy);});
            txt(page,'Mujeres: '+percent(t[2],t[1])+' de la matrícula · Docentes mujeres: '+fmt.format(t[5])+' · Docentes hombres: '+fmt.format(t[6]),28,H-263,9);
            const metricLines=['Fuente: estadística educativa de la SEP Puebla. Corte: '+snapshot.period+'.','Docentes incluye directivos con grupo. Escuelas: recuento de registros estadísticos de esta edición.','Porcentajes calculados con los filtros activos. Sin datos se representa con una raya.'];metricLines.forEach((line,i)=>txt(page,line,28,70-i*13,8));
            // The overview charts are also retained as data tables on the first page.
            let tableY=H-291;txt(page,'Resumen de la consulta',28,tableY,12,true);tableY-=21;
            [['Indicador','Total','Mujeres','Hombres'],['Matrícula',fmt.format(t[1]),fmt.format(t[2]),fmt.format(t[3])],['Docentes',fmt.format(t[4]),fmt.format(t[5]),fmt.format(t[6])]].forEach((row,i)=>{row.forEach((v,j)=>txt(page,v,[28,260,435,610][j],tableY-i*25,11,i===0));page.drawLine({start:{x:28,y:tableY-i*25-7},end:{x:810,y:tableY-i*25-7},thickness:.5,color:light});});
            for(let start=0;start<snapshot.charts.length;start+=3){page=pageBase(2+start/3,snapshot.name+' · '+snapshot.period);const sub=wrap(filterText,780,8);sub.slice(0,3).forEach((line,i)=>txt(page,line,28,H-86-i*11,8));for(let i=0;i<3;i++){const chart=snapshot.charts[start+i];if(!chart)continue;const x=28+i*266;wrap(chart.title,244,11,true).forEach((line,j)=>txt(page,line,x,H-137-j*14,11,true));if(chart.svg){const png=await pdf.embedPng(await svgPng(chart.svg,1200));const size=png.scaleToFit(247,330);page.drawImage(png,{x:x+(247-size.width)/2,y:115+(330-size.height)/2,width:size.width,height:size.height});}else txt(page,'Sin datos para los filtros elegidos.',x,300,9);}}
            if(snapshot.comparison.length){page=pageBase(4,'Comparación territorial · '+snapshot.period);txt(page,'Comparar territorios',28,H-100,18,true);let y=H-127;wrap(filterText,780,9).forEach(line=>{txt(page,line,28,y,9);y-=13;});y-=20;['Territorio','Escuelas','Matrícula','Docentes','% mujeres'].forEach((v,i)=>txt(page,v,[28,350,460,575,690][i],y,10,true));y-=24;snapshot.comparison.forEach(({name,totals:t})=>{[name,fmt.format(t[0]),fmt.format(t[1]),fmt.format(t[4]),percent(t[2],t[1])].forEach((v,i)=>txt(page,v,[28,350,460,575,690][i],y,10));y-=27;});}
            const bytes=await pdf.save();if(reportUrl)URL.revokeObjectURL(reportUrl);reportUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));status('Reporte PDF listo. ');const link=document.createElement('a');link.href=reportUrl;link.download='Analisis_'+normalize(snapshot.name).replace(/[^a-z0-9]+/g,'_')+'_2025_2026.pdf';link.textContent='Descargar reporte PDF';link.className='ae-report-link';$('.ae-status').appendChild(link);link.click();
        } catch(error){console.error(error);status('No se pudo generar el reporte. Comprueba que js/pdf-lib.min.js esté disponible e inténtalo de nuevo.',true);} finally {exportBusy=false;button.disabled=false;}
    }
    async function open(button) {
        if(!dialog)build();opener=button||document.activeElement;
        if(!dialog.open)dialog.showModal();
        if(data){updateTerritory();render();return;}
        if(!loadPromise)loadPromise=fetch('data/estadistica-agregada.json').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(json=>{
            const totals=json.filas.reduce((s,r)=>add(s,r),zero());if(totals.some((v,i)=>v!==json.totales[i]))throw new Error('Totales agregados inconsistentes');data=json;collectGeometries();
        }).catch(error=>{loadPromise=null;throw error;});
        try {await loadPromise;$('.ae-loading').hidden=true;$('.ae-content').hidden=false;dialog.querySelectorAll('[data-action]').forEach(button=>button.disabled=false);updateTerritory();render();}
        catch(error){$('.ae-loading').innerHTML='<p>No se pudo cargar la estadística.</p><p>Abre el Atlas mediante un servidor web y comprueba que exista <strong>data/estadistica-agregada.json</strong>.</p><button type="button" class="ae-action" id="ae-retry">Reintentar</button>';$('#ae-retry').onclick=()=>open(button);console.error(error);}
    }
    function start() {
        if(typeof map==='undefined'||typeof L==='undefined')return;
        const control=L.control({position:'topleft'});
        control.onAdd=()=>{const box=L.DomUtil.create('div','leaflet-control atlas-analisis-control');const b=document.createElement('button');b.type='button';b.title='Análisis estadístico';b.setAttribute('aria-label','Abrir Análisis estadístico');b.setAttribute('aria-haspopup','dialog');b.innerHTML=svgIcon('chart',20);b.onclick=()=>open(b);box.appendChild(b);L.DomEvent.disableClickPropagation(box);L.DomEvent.disableScrollPropagation(box);return box;};control.addTo(map);
        function position(){const download=document.querySelector('.atlas-descargas-control');if(download){download.insertAdjacentElement('afterend',control.getContainer());return true;}return false;}
        position();let tries=0;const timer=setInterval(()=>{if(position()||++tries>20)clearInterval(timer);},150);
        window.AtlasAnalisis={abrir:()=>open(document.querySelector('.atlas-analisis-control button')),consultar:()=>data?{territorio:territoryName(),totales:sum(territoryRows()).slice()}:null};
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
