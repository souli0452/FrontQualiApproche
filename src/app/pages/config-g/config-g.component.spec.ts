import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigGComponent } from './config-g.component';

describe('ConfigGComponent', () => {
  let component: ConfigGComponent;
  let fixture: ComponentFixture<ConfigGComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigGComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigGComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
