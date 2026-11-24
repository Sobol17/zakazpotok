import React from "react";
import { AbsoluteFill, Audio, Composition, Img, Still, staticFile, useCurrentFrame } from "remotion";
import capture from "./screens.json";
import { cameraAt, pointerAt, progress, windowWidth, windowHeight } from "./camera";
import "./film.css";

const duration = capture.durationInFrames;
const changeDelay = 6;
const {steps, finalScreen, viewport} = capture;
const chapters = [
  {start: 0, name: "Заказ"},
  {start: 156, name: "Смета"},
  {start: 282, name: "Оплата"},
  {start: 498, name: "Поступления"},
];
const captions = [
  {start: 0, title: ["От заказа", "до оплаты."], note: "Один заказ в CRM"},
  {start: 67, title: ["Откройте", "заказ."], note: "Заказ на откатные ворота", figure: "№ 1045"},
  {start: 156, title: ["Проверьте", "смету."], note: "Материалы и работы", figure: "158 000 ₽", reveal: 209},
  {start: 282, title: ["Примите", "оплату."], note: "Остаток по заказу", figure: "79 000 ₽"},
  {start: 403, title: ["Заказ", "оплачен."], note: "К получению", figure: "0 ₽"},
  {start: 498, title: ["Сверьте", "платёж."], note: "Поступление от клиента", figure: "79 000 ₽", reveal: 559},
];
const out = (t) => 1 - (1 - t) ** 3;

function Mark() {
  return <svg width="45" height="38" viewBox="0 0 40 32" fill="none" aria-hidden="true">
    <path d="M3 6h8c8 0 7 10 15 10M3 26h8c8 0 7-10 15-10M3 16h32m-7-7 7 7-7 7"
      stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

// A single engraved sweep at the opening. The contours stay still during the demo.
function Contours({frame}) {
  const draw = out(progress(frame, -8, 38));
  return <svg className="contours" width="1600" height="900" viewBox="0 0 1600 900" fill="none">
    {Array.from({length:12}, (_, i) => <path key={i}
      d={`M ${-285 + 6*i} ${305 + 14*i} C ${115 + i*6} ${350 + 14*i}, ${-124 + 2*i} ${846 - i*2}, ${322 + 9*i} ${773 + 3*i} S ${910 + i*8} ${349 + 3*i}, ${1345 + i*6} ${542 - 4*i} S 1780 604, 1870 50`}
      stroke={i===6 ? "#b389a4" : "#86657f"} opacity={i===6 ? .31 : .17} strokeWidth={i===6 ? 2 : 1.4}
      pathLength="1" strokeDasharray="1" strokeDashoffset={1-draw}/>)}
  </svg>;
}

function Caption({frame, copy}) {
  const f = frame - copy.start;
  const next = captions.find(chapter => chapter.start > copy.start);
  const leave = next ? progress(frame,next.start-5,next.start) : 0;
  const reveal = out(progress(frame, copy.reveal ?? copy.start + 5, (copy.reveal ?? copy.start + 5) + 12));
  return <div className="caption" style={{opacity:1-leave}}>
    {copy.title.map((word,i) => {
      const t = out(progress(f, -5+i*3, 13+i*3));
      return <div className="word-mask" key={word}><div className={i ? "italic" : "heavy"}
        style={{transform:`translateY(${(1-t)*105}%)`}}>{word}</div></div>;
    })}
    <div className="amount" style={{opacity:reveal, transform:`translateY(${(1-reveal)*10}px)`}}>
      <div className="annotation">{copy.note}</div>
      {copy.figure && <strong>{copy.figure}</strong>}
    </div>
  </div>;
}

function Timeline({frame}) {
  return <div className="timeline">{chapters.map((chapter,i) => {
    const end = chapters[i+1]?.start ?? duration - 1;
    return <div key={chapter.name} className={'chapter ' + (frame>=chapter.start ? 'lit' : '')}>
      <div className="track"><i style={{transform:'scaleX('+progress(frame,chapter.start,end)+')'}}/></div>
      {chapter.name}
    </div>;
  })}</div>;
}

function Click({frame, view}) {
  const pos = pointerAt(frame);
  const scale = windowWidth / view.width;
  const place = point => ({left:(point.x-view.x)*scale,top:(point.y-view.y)*scale});
  const last = steps.findLast(step=>step.frame<=frame);
  const age = last ? frame-last.frame : Infinity;
  const press = age<8 ? 1 - .22*Math.sin(Math.PI*age/8) : 1;
  return <>
    {age<23 && [0,4].map(delay=>{
      const t=progress(age,delay,delay+18);
      if(age<delay || t>=1)return null;
      const size=13+84*out(t);
      return <div key={delay} className={'wave '+(delay?'echo':'')} style={{
        ...place(last),width:size,height:size,opacity:(1-t)**1.2,
      }}/>;
    })}
    <svg className="pointer" viewBox="0 0 29 35" style={{
      ...place(pos), opacity:progress(frame,25,36)*(1-progress(frame,569,579)),
      transform:`translate(-3px,-3px) scale(${press})`,
    }}>
      <path d="M2.5 2.5 5.7 28 12 21.6 16.5 32 21.4 29.8 16.9 19.8 26 19.1Z"
        fill="#4b2a42" stroke="white" strokeWidth="2.3" strokeLinejoin="round"/>
    </svg>
  </>;
}

// A short underline identifies the amount in the actual screenshot, in document coordinates.
const underlines = [
  {from:234,to:280,x:853,y:610,w:86},
  {from:428,to:449,x:1352,y:412,w:26},
  {from:610,to:660,x:1303,y:477,w:62},
];
function Product({frame}) {
  const view = cameraAt(frame);
  const current = steps.find(s=>frame<s.frame+changeDelay)?.screen ?? finalScreen;
  const modalStep = steps.find(s => (s.screen === "estimate" || s.screen === "confirm")
    && frame >= s.frame + changeDelay && frame < s.frame + changeDelay + 9);
  const blend = modalStep ? progress(frame, modalStep.frame + changeDelay, modalStep.frame + changeDelay + 9) : 1;
  const scale = windowWidth / view.width;
  const mark = underlines.find(r=>frame>=r.from && frame<r.to);
  return <div className="product" style={{width:windowWidth,height:windowHeight}}>
    <div className="scene">
      <div className="world" style={{width:viewport.width,height:viewport.height,
        transform:`scale(${scale}) translate(${-view.x}px,${-view.y}px)`}}>
        {modalStep && <Img className="page" src={staticFile("screens/"+modalStep.screen+".png")}/>}
        <Img className="page" style={{position:"absolute",inset:0,opacity:blend*blend*(3-2*blend)}} src={staticFile("screens/"+current+".png")}/>
        {mark && <div className="underline" style={{left:mark.x,top:mark.y,width:mark.w,
          opacity:Math.min(1,(mark.to-frame)/5),transform:'scaleX('+out(progress(frame,mark.from,mark.from+9))+')'}}/>}
      </div>
      <Click frame={frame} view={view}/>
    </div>
  </div>;
}

function Fonts() {
  return <style>{'@font-face{font-family:Onest;src:url('+staticFile("onest-400.ttf")+')}@font-face{font-family:Onest;font-weight:700;src:url('+staticFile("onest-700.ttf")+')}'}</style>;
}

function Poster() {
  return <AbsoluteFill className="film opening">
    <Fonts/>
    <Img className="cover-art" src={staticFile("cover-art.png")}/>
    <header><div className="brand"><Mark/>ЗаказПоток</div></header>
    <div className="caption">
      <div className="heavy">От заказа</div>
      <div className="italic">до оплаты.</div>
      <div className="amount"><div className="annotation">Один заказ в CRM</div></div>
    </div>
  </AbsoluteFill>;
}

function Film() {
  const frame = useCurrentFrame();
  const copy = captions.findLast(c=>c.start<=frame);
  const intro = progress(frame, 19, 41);
  return <AbsoluteFill className="film">
    <Fonts/>
    <Audio src={staticFile("score.wav")}/>
    {frame > 19 && <>
      <Contours frame={frame}/>
      <header><div className="brand"><Mark/>ЗаказПоток</div><div className="order-id">Откатные ворота <span>/</span> № 1045</div></header>
      <Caption frame={frame} copy={copy}/>
      <Product frame={frame}/>
      <Timeline frame={frame}/>
    </>}
    {frame < 41 && <AbsoluteFill style={{opacity:1-intro*intro*(3-2*intro)}}><Poster/></AbsoluteFill>}
  </AbsoluteFill>;
}

export const Root=()=> <>
  <Still id="OverviewPoster" component={Poster} width={1600} height={900}/>
  <Composition id="OrderToPayment" component={Film} durationInFrames={duration} fps={capture.fps} width={1600} height={900}/>
</>;
